import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ResourceTemplate, type McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { zodToJsonSchema } from "../../utils/zod-json.js";
import { DesignPlanSchema } from "../../schemas/design-plan.js";
import { STYLE_PALETTES } from "../../design-engine/color/palettes.js";
import { TYPE_SYSTEMS } from "../../design-engine/typography/type-systems.js";
import { TEMPLATES } from "../../design-engine/templates/library.js";
import { LONG_RUNNING_TOOLS, registeredTools, type ToolContext } from "../tools/common.js";
import { toMcpError } from "../../utils/errors.js";
import { SERVER_INFO } from "../../server.js";

const json = (uri: string, value: unknown) => ({ contents: [{ uri, mimeType: "application/json", text: JSON.stringify(value, null, 2) }] });

/** Features the Illustrator scripting API (v31) does not expose. Listed so agents don't promise them. */
const NOT_SCRIPTABLE = [
  "freeform gradients", "gradient mesh creation", "Puppet Warp", "Intertwine", "Shape Builder",
  "Perspective Grid drawing", "Live Paint editing",
];

/**
 * Read live state from Illustrator. Each read is one bridge op; failures (Illustrator closed, no document)
 * are returned as structured JSON rather than thrown, so agents can tell "empty" from "unavailable".
 */
async function live(ctx: ToolContext, uri: string, op: string, args: object = {}) {
  try {
    const r = await ctx.bridge.run(op, args);
    return json(uri, { ok: true, source: ctx.bridge.adapterName === "mock" ? "mock" : "illustrator", data: r.data, warnings: r.warnings });
  } catch (err) {
    const e = toMcpError(err);
    return json(uri, { ok: false, error: { code: e.code, message: e.message } });
  }
}

function registerLiveResources(server: McpServer, ctx: ToolContext): void {
  const reg = (name: string, path: string, description: string, read: (uri: string) => Promise<ReturnType<typeof json>>) =>
    server.registerResource(name, `illustrator://${path}`, { title: name, description, mimeType: "application/json" }, async (uri) => read(uri.href));

  reg("status", "status", "Illustrator installation, bridge readiness, running application and open documents (live).", async (uri) => {
    const detection = await ctx.bridge.detect();
    const app = await live(ctx, uri, "status");
    const parsed = JSON.parse(app.contents[0]!.text) as { ok: boolean; data?: unknown; error?: unknown };
    return json(uri, { ok: true, adapter: ctx.bridge.adapterName, detection, application: parsed.ok ? parsed.data : null, applicationError: parsed.ok ? undefined : parsed.error, queuePending: ctx.bridge.pending, activeJobs: ctx.jobs.active });
  });
  reg("documents", "documents", "All open documents with path, saved state, color mode and which is active.", (uri) => live(ctx, uri, "list_documents"));
  reg("active-document", "active-document", "The document the server targets: artboards, layers and top-level objects with bounds (first 200).", (uri) => live(ctx, uri, "inspect_document", { limit: 200 }));
  reg("selection", "selection", "Currently selected objects with bounds, fills, strokes and text properties.", (uri) => live(ctx, uri, "inspect_selection", {}));
  reg("artboards", "artboards", "Artboards of the target document with sizes in points.", (uri) => live(ctx, uri, "get_artboards"));
  reg("layers", "layers", "Layers top-to-bottom with visibility, lock state and item counts.", (uri) => live(ctx, uri, "inspect_layers"));
  reg("colors", "colors", "Swatch groups, swatches and spot colors in the target document.", (uri) => live(ctx, uri, "list_swatches"));
  reg("fonts", "fonts", "Installed fonts (first 2000) and fonts used in the target document.", (uri) => live(ctx, uri, "inspect_fonts", { limit: 2000, documentFonts: true }));
  reg("brushes", "brushes", "Brushes, graphic styles, symbols and text styles defined in the target document.", (uri) => live(ctx, uri, "list_styles"));
  reg("linked-assets", "linked-assets", "Linked and embedded images, with missing links flagged.", (uri) => live(ctx, uri, "inspect_assets"));
  reg("capabilities", "capabilities", "What this server can do: tools, background-capable tools, export formats, limits and unsupported features.", async (uri) => json(uri, {
    ok: true,
    server: SERVER_INFO,
    adapter: ctx.bridge.adapterName,
    tools: [...registeredTools].sort(),
    backgroundTools: [...LONG_RUNNING_TOOLS].sort(),
    open: [".ai", ".ait", ".pdf", ".eps", ".svg", ".svgz", ".dxf", ".dwg", ".png", ".jpg", ".jpeg", ".tif", ".tiff", ".gif", ".bmp", ".psd"],
    save: [".ai", ".pdf", ".eps"],
    saveCopy: [".ai", ".ait", ".pdf", ".eps"],
    export: ["png", "jpg", "svg", "pdf", "eps"],
    limits: { maxArtboardPt: 16383, timeoutMs: ctx.config.illustrator.timeoutMs, jobTimeoutMs: ctx.config.illustrator.jobTimeoutMs, allowedRoots: ctx.paths.allowedRoots },
    coordinates: "points, origin at the artboard's top-left, y down (see illustrator://docs/coordinates)",
    notScriptable: NOT_SCRIPTABLE,
  }));
}

export function registerResources(server: McpServer, ctx: ToolContext): void {
  server.registerResource("design-plan-schema", "illustrator://schema/design-plan", {
    title: "Design plan JSON schema", description: "JSON Schema of the structured design representation", mimeType: "application/json",
  }, async (uri) => json(uri.href, zodToJsonSchema(DesignPlanSchema)));

  server.registerResource("templates", "illustrator://templates", {
    title: "Design templates", description: "Template ids, categories and default sizes", mimeType: "application/json",
  }, async (uri) => json(uri.href, TEMPLATES.map((t) => ({ id: t.id, name: t.name, category: t.category, description: t.description, defaultSize: t.defaultSize }))));

  server.registerResource("styles", "illustrator://styles", {
    title: "Style systems", description: "Palettes and typography systems per design style", mimeType: "application/json",
  }, async (uri) => json(uri.href, Object.fromEntries(Object.keys(TYPE_SYSTEMS).map((s) => [s, { palette: STYLE_PALETTES[s], typography: TYPE_SYSTEMS[s] }]))));

  server.registerResource("coordinate-convention", "illustrator://docs/coordinates", {
    title: "Coordinate convention", mimeType: "text/markdown",
  }, async (uri) => ({ contents: [{ uri: uri.href, mimeType: "text/markdown", text: readFileSync(join(ctx.config.projectRoot, "docs", "COORDINATES.md"), "utf8") }] }));

  registerLiveResources(server, ctx);

  server.registerResource("design-plan", new ResourceTemplate("illustrator://plans/{planId}", {
    list: async () => ({ resources: ctx.plans.list().map((p) => ({ uri: `illustrator://plans/${p.id}`, name: p.title ?? p.id, mimeType: "application/json" })) }),
  }), { title: "Stored design plan", mimeType: "application/json" }, async (uri, vars) => json(uri.href, ctx.plans.get(String(vars.planId))));
}
