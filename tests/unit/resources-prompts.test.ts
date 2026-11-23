import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadConfig } from "../../src/config/index.js";
import { MockAdapter } from "../../src/illustrator/bridge/mock-adapter.js";
import { createContext, createServer } from "../../src/server.js";

const LIVE = ["status", "documents", "active-document", "selection", "artboards", "layers", "colors", "fonts", "brushes", "linked-assets", "capabilities"];
const PROMPTS = [
  "create_professional_logo", "corporate_brand_identity", "brand_guidelines_document", "business_card", "professional_poster",
  "vector_illustration", "character_illustration", "product_packaging", "seamless_pattern", "infographic", "icon_library",
  "fashion_technical_drawing", "prepare_for_print", "audit_document",
];

let client: Client;
let mock: MockAdapter;
const read = async (path: string) => {
  const r = await client.readResource({ uri: `illustrator://${path}` });
  return JSON.parse((r.contents[0] as { text: string }).text) as Record<string, any>;
};

beforeAll(async () => {
  const config = loadConfig({ ILLUSTRATOR_ADAPTER: "mock", ALLOWED_PATHS: mkdtempSync(join(tmpdir(), "mcp-res-")), LOG_LEVEL: "error" }, []);
  mock = new MockAdapter();
  const server = createServer(createContext(config, mock));
  const [a, b] = InMemoryTransport.createLinkedPair();
  client = new Client({ name: "test", version: "1.0.0" });
  await Promise.all([server.connect(a), client.connect(b)]);
});
afterAll(async () => client.close());

describe("live resources", () => {
  it("lists every spec resource", async () => {
    const { resources } = await client.listResources();
    const uris = resources.map((r) => r.uri);
    for (const p of LIVE) expect(uris, p).toContain(`illustrator://${p}`);
  });

  it("returns structured errors instead of throwing when no document is open", async () => {
    mock.on("inspect_layers", { ok: false, error: { code: "NO_ACTIVE_DOCUMENT", message: "No document is open in Illustrator." } });
    const body = await read("layers");
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("NO_ACTIVE_DOCUMENT");
  });

  it("returns live data with its source once a document exists", async () => {
    await client.callTool({ name: "create_document", arguments: { width: 100, height: 100, units: "px", colorMode: "RGB" } });
    const body = await read("artboards");
    expect(body.ok).toBe(true);
    expect(body.source).toBe("mock");
    expect(body.data.artboards.length).toBe(1);
    const before = mock.calls.length;
    await read("documents");
    expect(mock.calls.slice(before).map((c) => c.op)).toEqual(["list_documents"]);
  });

  it("status reports detection, application and job counts", async () => {
    const body = await read("status");
    expect(body.ok).toBe(true);
    expect(body.adapter).toBe("mock");
    expect(body.application).toBeTruthy();
    expect(body.activeJobs).toBe(0);
  });

  it("capabilities lists tools, background tools and honest limits", async () => {
    const body = await read("capabilities");
    expect(body.tools).toContain("save_file");
    expect(body.backgroundTools).toContain("execute_design_plan");
    expect(body.notScriptable).toContain("Puppet Warp");
    expect(body.save).toEqual([".ai", ".pdf", ".eps"]);
    expect(body.saveCopy).toContain(".ait");
  });
});

describe("prompt templates", () => {
  it("registers every spec template with a description", async () => {
    const { prompts } = await client.listPrompts();
    const byName = new Map(prompts.map((p) => [p.name, p]));
    for (const n of PROMPTS) {
      expect(byName.has(n), n).toBe(true);
      expect(byName.get(n)!.description!.length).toBeGreaterThan(10);
    }
  });

  it("fills arguments and always includes validation and save/export steps", async () => {
    for (const n of PROMPTS) {
      const { prompts } = await client.listPrompts();
      const args = Object.fromEntries((prompts.find((p) => p.name === n)!.arguments ?? []).filter((a) => a.required).map((a) => [a.name, `X-${a.name}`]));
      const r = await client.getPrompt({ name: n, arguments: args });
      const text = (r.messages[0]!.content as { text: string }).text;
      for (const v of Object.values(args)) expect(text, n).toContain(v);
      expect(text, n).toContain("save_file");
      expect(text, n).toMatch(/preview/);
      expect(text, n).not.toMatch(/â€/);
    }
  });
});
