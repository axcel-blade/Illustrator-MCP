/**
 * Security regression tests: file-system sandbox, script-injection resistance, the op allowlist,
 * confirmation gates, HTTP auth and settings precedence. Runs without Illustrator (mock adapter).
 */
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadConfig, loadDotEnv } from "../../src/config/index.js";
import { IllustratorBridge } from "../../src/illustrator/bridge/bridge.js";
import { MockAdapter } from "../../src/illustrator/bridge/mock-adapter.js";
import { ALLOWED_OPS, buildScript, toJsxLiteral } from "../../src/illustrator/bridge/script-builder.js";
import { createContext, createServer } from "../../src/server.js";
import { authorize } from "../../src/transport/http.js";
import { PathPolicy } from "../../src/utils/paths.js";

const root = mkdtempSync(join(tmpdir(), "mcp-sec-"));

describe("file-system sandbox", () => {
  const policy = new PathPolicy([root]);
  const code = (fn: () => unknown) => {
    try { fn(); return "ok"; } catch (e) { return (e as { code?: string }).code ?? String(e); }
  };

  it.each([
    ["parent traversal", "../outside.ai"],
    ["nested traversal", "a/../../outside.ai"],
    ["absolute path elsewhere", process.platform === "win32" ? "C:\\Windows\\system32\\x.ai" : "/etc/x.ai"],
    ["UNC share", "\\\\server\\share\\x.ai"],
    ["forward-slash UNC", "//server/share/x.ai"],
    ["NUL byte", "x.ai\0.png"],
    ["sibling with shared prefix", `${root}-evil${process.platform === "win32" ? "\\" : "/"}x.ai`],
  ])("rejects %s", (_label, input) => {
    expect(code(() => policy.resolve(input))).toBe("PATH_NOT_ALLOWED");
  });

  it("accepts paths inside the root and enforces extensions", () => {
    expect(policy.resolve("sub/ok.ai", { extensions: [".ai"] })).toBe(join(root, "sub", "ok.ai"));
    expect(code(() => policy.resolve("ok.ai.exe", { extensions: [".ai"] }))).toBe("VALIDATION_ERROR");
    expect(code(() => policy.resolve("noext", { extensions: [".ai"] }))).toBe("VALIDATION_ERROR");
  });

  it("refuses to overwrite unless asked", () => {
    writeFileSync(join(root, "taken.png"), "x");
    expect(code(() => policy.resolveOutput("taken.png", { extensions: [".png"] }))).toBe("FILE_EXISTS");
    expect(code(() => policy.resolveOutput("taken.png", { extensions: [".png"], overwrite: true }))).toBe("ok");
  });
});

describe("script generation", () => {
  it("embeds client strings as data, never as code", () => {
    const evil = '"); app.quit(); ("\u2028\u2029</script>';
    const script = buildScript("add_text", { content: evil }, "C:\\r.json");
    const invocation = script.slice(script.lastIndexOf("// ---- invocation ----"));
    /* Exactly one call, and the payload is a single JSON string literal. */
    expect(invocation.match(/MCP\.main\(/g)).toHaveLength(1);
    /* The whole call parses back as (JSON command, JSON path) with the payload intact. */
    const m = invocation.match(/MCP\.main\((\{.*\}), ("[^"]*")\);\s*$/s);
    expect(m).not.toBeNull();
    expect(JSON.parse(m![1]!)).toEqual({ op: "add_text", args: { content: evil } });
    expect(toJsxLiteral(evil)).not.toMatch(/[\u2028\u2029]/);
    expect(JSON.parse(toJsxLiteral(evil))).toBe(evil);
  });

  it("the bridge refuses operations outside the allowlist before contacting Illustrator", async () => {
    const mock = new MockAdapter();
    const bridge = new IllustratorBridge(mock, { timeoutMs: 5000 } as never);
    for (const op of ["eval", "doScript", "app.quit", "__proto__", "system"]) {
      expect(ALLOWED_OPS.has(op)).toBe(false);
      await expect(bridge.run(op, {})).rejects.toMatchObject({ code: "UNSUPPORTED_OPERATION" });
    }
    expect(mock.calls).toHaveLength(0);
  });
});

describe("tools", () => {
  let client: Client;
  let mock: MockAdapter;
  beforeAll(async () => {
    const config = loadConfig({ ILLUSTRATOR_ADAPTER: "mock", ALLOWED_PATHS: root, LOG_LEVEL: "error" }, []);
    mock = new MockAdapter();
    const server = createServer(createContext(config, mock));
    const [a, b] = InMemoryTransport.createLinkedPair();
    await server.connect(a);
    client = new Client({ name: "sec", version: "1" });
    await client.connect(b);
    await client.callTool({ name: "create_document", arguments: { width: 100, height: 100 } });
  });
  afterAll(async () => client.close());

  const call = async (name: string, args: Record<string, unknown>) => {
    const r = (await client.callTool({ name, arguments: args })) as { content: { text: string }[] };
    return JSON.parse(r.content[0]!.text) as { ok: boolean; error?: { code: string } };
  };

  it.each([
    ["delete_object", { target: { name: "a" } }],
    ["delete_layer", { name: "Layer 1" }],
    ["close_document", { save: false }],
    ["run_action", { action: "A", set: "S" }],
    ["print_document", {}],
  ])("%s needs confirm: true and sends nothing to Illustrator without it", async (tool, args) => {
    const before = mock.calls.length;
    expect((await call(tool, args)).error?.code).toBe("CONFIRMATION_REQUIRED");
    expect(mock.calls.length).toBe(before);
  });

  it.each([
    ["save_document_as", { path: "../escape.ai" }],
    ["export_png", { path: "../escape.png" }],
    ["export_artboards", { folder: "..", formats: ["png"] }],
    ["data_merge_export", { rows: [{ a: "b" }], folder: "../out" }],
    ["place_image", { path: "../secret.png" }],
  ])("%s cannot leave the allowed folders", async (tool, args) => {
    const r = await call(tool, args);
    expect(r.ok).toBe(false);
    expect(["PATH_NOT_ALLOWED", "OBJECT_NOT_FOUND"]).toContain(r.error?.code);
  });

  it("export_artboards rejects file-name prefixes that could form paths", async () => {
    const r = (await client.callTool({ name: "export_artboards", arguments: { folder: ".", prefix: "../x", formats: ["png"] } })) as { isError?: boolean };
    expect(r.isError).toBe(true);
  });
});

describe("HTTP and settings", () => {
  const http = { host: "0.0.0.0", port: 3333, authToken: "t".repeat(32), secretPath: undefined };

  it("requires the bearer token on a public bind and compares it exactly", () => {
    expect(authorize({ headers: {}, url: "/mcp" }, http).ok).toBe(false);
    expect(authorize({ headers: { authorization: `Bearer ${"t".repeat(31)}` }, url: "/mcp" }, http).ok).toBe(false);
    expect(authorize({ headers: { authorization: `Bearer ${"t".repeat(32)}` }, url: "/mcp" }, http).ok).toBe(true);
  });

  it("refuses a public bind without credentials and short secrets", () => {
    expect(() => loadConfig({ MCP_TRANSPORT: "http", MCP_HTTP_HOST: "0.0.0.0" }, [])).toThrow(/Refusing/);
    expect(() => loadConfig({ MCP_TRANSPORT: "http", MCP_HTTP_HOST: "0.0.0.0", MCP_AUTH_TOKEN: "short" }, [])).toThrow(/24/);
  });

  it("a .env file fills missing settings but never overrides the MCP client's", () => {
    const file = join(root, "test.env");
    writeFileSync(file, ["ALLOWED_PATHS=/", "LOG_LEVEL=debug", ""].join("\n"));
    const env: NodeJS.ProcessEnv = { ILLUSTRATOR_MCP_ENV_FILE: file, ALLOWED_PATHS: root };
    expect(loadDotEnv(env)).toBe(file);
    expect(env.ALLOWED_PATHS).toBe(root);
    expect(env.LOG_LEVEL).toBe("debug");
    expect(process.env.LOG_LEVEL).not.toBe("debug");
  });
});
