import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadConfig } from "../../src/config/index.js";
import { MockAdapter } from "../../src/illustrator/bridge/mock-adapter.js";
import { ALLOWED_OPS, loadScriptLibrary } from "../../src/illustrator/bridge/script-builder.js";
import { createContext, createServer } from "../../src/server.js";

let client: Client;
let mock: MockAdapter;
let out: string;
type R = { isError?: boolean; content: { type: string; text?: string }[] };
const call = async (name: string, args: Record<string, unknown> = {}) => {
  const r = (await client.callTool({ name, arguments: args })) as R;
  return { isError: Boolean(r.isError), body: JSON.parse(r.content[0]!.text!) as Record<string, any> };
};
const last = () => mock.calls.at(-1)!;

beforeAll(async () => {
  out = mkdtempSync(join(tmpdir(), "mcp-file-"));
  const config = loadConfig({ ILLUSTRATOR_ADAPTER: "mock", ALLOWED_PATHS: out, LOG_LEVEL: "error" }, []);
  mock = new MockAdapter();
  const server = createServer(createContext(config, mock));
  const [a, b] = InMemoryTransport.createLinkedPair();
  client = new Client({ name: "test", version: "1.0.0" });
  await Promise.all([server.connect(a), client.connect(b)]);
});
afterAll(async () => client.close());

describe("File menu tools", () => {
  it("JSX implements every new op and the bridge allowlists it", () => {
    const lib = loadScriptLibrary();
    for (const op of ["save_copy", "save_all_documents", "revert_document", "close_all_documents", "list_recent_files"]) {
      expect(ALLOWED_OPS.has(op), op).toBe(true);
      expect(lib, op).toContain(`MCP.ops.${op} = function`);
    }
  });

  it("save_copy validates the path and passes the format", async () => {
    expect((await call("save_copy", { path: "copy.svg" })).body.error.code).toBe("VALIDATION_ERROR");
    expect((await call("save_copy", { path: "C:\\Windows\\copy.ai" })).body.error.code).toBe("PATH_NOT_ALLOWED");
    writeFileSync(join(out, "taken.pdf"), "x");
    expect((await call("save_copy", { path: "taken.pdf" })).body.error.code).toBe("FILE_EXISTS");
    await call("save_copy", { path: "copy.pdf" });
    expect(last()).toMatchObject({ op: "save_copy", args: { format: "pdf" } });
  });

  it("revert and discard-close need confirmation; save-close does not", async () => {
    expect((await call("revert_document", {})).body.error.code).toBe("CONFIRMATION_REQUIRED");
    expect((await call("revert_document", { confirm: true })).body.ok).toBe(true);
    expect((await call("close_all_documents", { mode: "discard" })).body.error.code).toBe("CONFIRMATION_REQUIRED");
    expect((await call("close_all_documents", { mode: "discard", confirm: true, except: ["Keep"] })).body.ok).toBe(true);
    expect(last().args).toEqual({ mode: "discard", except: ["Keep"] });
    expect((await call("close_all_documents", { mode: "save" })).body.ok).toBe(true);
  });

  it("open_recent_file opens by index through the path sandbox", async () => {
    writeFileSync(join(out, "recent.ai"), "x");
    mock.on("list_recent_files", () => ({ files: [
      { index: 0, path: join(out, "recent.ai"), exists: true },
      { index: 1, path: "C:\\Windows\\elsewhere.ai", exists: true },
    ] }));
    await call("open_recent_file", { index: 0 });
    expect(last()).toMatchObject({ op: "open_file", args: { path: join(out, "recent.ai") } });
    expect((await call("open_recent_file", { index: 1 })).body.error.code).toBe("PATH_NOT_ALLOWED");
    expect((await call("open_recent_file", { index: 7 })).body.error.code).toBe("OBJECT_NOT_FOUND");
  });

  it("new_from_template only accepts .ait files", async () => {
    writeFileSync(join(out, "brand.ait"), "x");
    await call("new_from_template", { path: "brand.ait" });
    expect(last()).toMatchObject({ op: "open_file", args: { reopen: true } });
    writeFileSync(join(out, "brand.ai"), "x");
    expect((await call("new_from_template", { path: "brand.ai" })).body.error.code).toBe("VALIDATION_ERROR");
  });
});
