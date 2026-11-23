import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadConfig } from "../../src/config/index.js";
import { MockAdapter } from "../../src/illustrator/bridge/mock-adapter.js";
import { ALLOWED_OPS, loadScriptLibrary } from "../../src/illustrator/bridge/script-builder.js";
import { arcPoints, spiralPoints, trianglePoints } from "../../src/mcp/tools/production.js";
import { createContext, createServer } from "../../src/server.js";

const NEW_TOOLS = ["draw_triangle", "draw_arc", "draw_spiral", "shear_objects", "select_all", "get_object_properties", "duplicate_layer", "create_sublayer",
  "get_document_settings", "set_raster_effects_resolution", "export_tiff", "export_selection", "export_print_pdf", "preflight_document", "cleanup_document",
  "batch_operation", "generate_design_report"];

describe("geometry", () => {
  it("arc points lie on the circle with 90-degree segments", () => {
    const pts = arcPoints(100, 100, 50, 50, 0, 180);
    expect(pts).toHaveLength(3);
    for (const p of pts) expect(Math.hypot(p.x - 100, p.y - 100)).toBeCloseTo(50, 6);
    expect(pts[0]).toMatchObject({ x: 150, y: 100 });
    expect(pts[1]!.y).toBeCloseTo(150, 6); /* clockwise in y-down space: 90 deg is straight down */
    expect(pts[0]!.in).toBeUndefined();
    expect(pts[2]!.out).toBeUndefined();
    /* handle length for a quarter circle is 0.5523 * r */
    expect(Math.hypot(pts[0]!.out![0] - 150, pts[0]!.out![1] - 100)).toBeCloseTo(50 * 0.5523, 2);
  });

  it("triangles fit their box", () => {
    expect(trianglePoints("isosceles", 0, 0, 100, 80)).toEqual([{ x: 50, y: 0 }, { x: 100, y: 80 }, { x: 0, y: 80 }]);
    expect(trianglePoints("right", 10, 10, 20, 30)).toEqual([{ x: 10, y: 10 }, { x: 30, y: 40 }, { x: 10, y: 40 }]);
    const eq = trianglePoints("equilateral", 0, 0, 100, 0);
    expect(Math.hypot(eq[1]!.x - eq[0]!.x, eq[1]!.y - eq[0]!.y)).toBeCloseTo(100, 6);
  });

  it("spirals grow from inner to outer radius", () => {
    const pts = spiralPoints(0, 0, 10, 100, 2, true);
    expect(Math.hypot(pts[0]!.x, pts[0]!.y)).toBeCloseTo(10, 6);
    expect(Math.hypot(pts.at(-1)!.x, pts.at(-1)!.y)).toBeCloseTo(100, 6);
  });
});

describe("JSX library", () => {
  it("implements every new op that the bridge allowlists", () => {
    const lib = loadScriptLibrary();
    for (const opName of ["shear_objects", "select_all", "get_object_properties", "duplicate_layer", "create_sublayer", "get_document_settings",
      "set_raster_effects_resolution", "export_tiff", "export_selection", "export_print_pdf", "preflight_document", "cleanup_document"]) {
      expect(ALLOWED_OPS.has(opName), opName).toBe(true);
      expect(lib, opName).toContain(`MCP.ops.${opName} = function`);
    }
  });
});

describe("production tools over MCP", () => {
  let client: Client;
  let mock: MockAdapter;
  let out: string;
  type R = { isError?: boolean; content: { type: string; text?: string }[] };
  const call = async (name: string, args: Record<string, unknown> = {}) => {
    const r = (await client.callTool({ name, arguments: args })) as R;
    return { isError: Boolean(r.isError), body: JSON.parse(r.content[0]!.text!) as Record<string, any> };
  };
  const lastCall = () => mock.calls.at(-1)!;

  beforeAll(async () => {
    out = mkdtempSync(join(tmpdir(), "mcp-prod-"));
    const config = loadConfig({ ILLUSTRATOR_ADAPTER: "mock", ALLOWED_PATHS: out, LOG_LEVEL: "error" }, []);
    mock = new MockAdapter();
    const server = createServer(createContext(config, mock));
    const [a, b] = InMemoryTransport.createLinkedPair();
    client = new Client({ name: "test", version: "1.0.0" });
    await Promise.all([server.connect(a), client.connect(b)]);
    await call("create_document", { width: 200, height: 200, units: "px", colorMode: "RGB" });
  });
  afterAll(async () => client.close());

  it("registers every new tool", async () => {
    const names = (await client.listTools()).tools.map((t) => t.name);
    expect(NEW_TOOLS.filter((n) => !names.includes(n))).toEqual([]);
  });

  it("shapes become pen paths in points", async () => {
    await call("draw_triangle", { x: 0, y: 0, width: 1, height: 1, units: "in" });
    expect(lastCall().op).toBe("draw_pen_path");
    expect((lastCall().args as any).points[1]).toMatchObject({ x: 72, y: 72 });
    expect((lastCall().args as any).closed).toBe(true);
    await call("draw_arc", { cx: 50, cy: 50, radius: 20, startAngle: 0, endAngle: 90 });
    expect((lastCall().args as any).closed).toBe(false);
    expect((lastCall().args as any).fill).toBe("none");
    await call("draw_arc", { cx: 50, cy: 50, radius: 20, startAngle: 0, endAngle: 90, closure: "pie" });
    expect((lastCall().args as any).points).toHaveLength(3);
    expect((await call("draw_spiral", { cx: 0, cy: 0, outerRadius: 10, innerRadius: 20 })).body.error.code).toBe("VALIDATION_ERROR");
    expect((await call("draw_triangle", { x: 0, y: 0, width: 10 })).body.error.code).toBe("VALIDATION_ERROR");
  });

  it("validates shear and converts print bleed to points", async () => {
    expect((await call("shear_objects", { target: "selection" })).body.error.code).toBe("VALIDATION_ERROR");
    await call("export_print_pdf", { path: "print.pdf", bleed: 3 });
    expect(lastCall().op).toBe("export_print_pdf");
    expect((lastCall().args as any).bleed).toBeCloseTo(8.504, 2);
    expect((await call("export_tiff", { path: "x.png" })).body.error.code).toBe("VALIDATION_ERROR");
    expect((await call("export_selection", { path: "C:\\Windows\\x.png" })).body.error.code).toBe("PATH_NOT_ALLOWED");
  });

  it("cleanup is a dry run unless confirmed", async () => {
    await call("cleanup_document", {});
    expect((lastCall().args as any).dryRun).toBe(true);
    expect((await call("cleanup_document", { dryRun: false })).body.error.code).toBe("CONFIRMATION_REQUIRED");
    expect((await call("cleanup_document", { dryRun: false, confirm: true })).body.ok).toBe(true);
  });

  it("batch runs steps in order, validates each, and stops on failure", async () => {
    const before = mock.calls.length;
    const r = await call("batch_operation", { steps: [
      { tool: "draw_rectangle", args: { x: 0, y: 0, width: 10, height: 10, name: "A" } },
      { tool: "draw_circle", args: { cx: 5, cy: 5, radius: -1 } },
      { tool: "draw_rectangle", args: { x: 0, y: 0, width: 10, height: 10, name: "C" } },
    ] });
    expect(r.body.data).toMatchObject({ completed: 1, failed: 1, total: 3 });
    expect(r.body.data.results[1].error.code).toBe("VALIDATION_ERROR");
    expect(r.body.warnings.join(" ")).toMatch(/Stopped at step 2/);
    expect(mock.calls.slice(before).filter((c) => c.op === "draw_rectangle")).toHaveLength(1);

    const c = await call("batch_operation", { continueOnError: true, steps: [
      { tool: "draw_circle", args: { cx: 5, cy: 5, radius: -1 } },
      { tool: "draw_rectangle", args: { x: 0, y: 0, width: 10, height: 10 } },
    ] });
    expect(c.body.data).toMatchObject({ completed: 1, failed: 1 });
    expect((await call("batch_operation", { steps: [{ tool: "batch_operation", args: {} }] })).body.error.code).toBe("VALIDATION_ERROR");
    expect((await call("batch_operation", { steps: [{ tool: "nope" }] })).body.error.code).toBe("VALIDATION_ERROR");
    expect((await call("batch_operation", { steps: [{ tool: "delete_layer", args: { name: "Layer 1" } }] })).body.data.results[0].error.code).toBe("CONFIRMATION_REQUIRED");
  });
});
