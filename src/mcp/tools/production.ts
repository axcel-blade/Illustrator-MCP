import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { McpDesignError, toMcpError } from "../../utils/errors.js";
import {
  artboardArg, defineTool, DESTRUCTIVE, op, P, READ_ONLY, requireConfirm, targetArg, targetsArg, toolHandlers, unitsArg, WRITE,
  type ToolContext, type ToolOutput,
} from "./common.js";
import { common, smoothPoints, style } from "./vector.js";

type Pt = { x: number; y: number; in?: [number, number]; out?: [number, number]; corner?: boolean };

/** Bezier points for an elliptical arc; angles in degrees, clockwise from 3 o'clock (y-down screen space). */
export function arcPoints(cx: number, cy: number, rx: number, ry: number, start: number, end: number): Pt[] {
  const sweep = end - start;
  if (sweep === 0) throw new McpDesignError("VALIDATION_ERROR", "startAngle and endAngle must differ");
  const segs = Math.max(1, Math.ceil(Math.abs(sweep) / 90));
  const step = ((sweep / segs) * Math.PI) / 180;
  const k = (4 / 3) * Math.tan(step / 4);
  const at = (a: number) => ({ x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) });
  const tan = (a: number) => ({ x: -rx * Math.sin(a), y: ry * Math.cos(a) });
  const pts: Pt[] = [];
  for (let i = 0; i <= segs; i++) {
    const a = (start * Math.PI) / 180 + i * step;
    const p = at(a), t = tan(a);
    pts.push({
      x: p.x, y: p.y,
      in: i > 0 ? [p.x - k * t.x, p.y - k * t.y] : undefined,
      out: i < segs ? [p.x + k * t.x, p.y + k * t.y] : undefined,
    });
  }
  return pts;
}

export function trianglePoints(kind: "isosceles" | "right" | "equilateral", x: number, y: number, w: number, h: number): Pt[] {
  if (kind === "right") return [{ x, y }, { x: x + w, y: y + h }, { x, y: y + h }];
  const height = kind === "equilateral" ? (w * Math.sqrt(3)) / 2 : h;
  return [{ x: x + w / 2, y }, { x: x + w, y: y + height }, { x, y: y + height }];
}

export function spiralPoints(cx: number, cy: number, inner: number, outer: number, turns: number, clockwise: boolean): Pt[] {
  const n = Math.max(8, Math.round(turns * 16));
  const raw = Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n, a = (clockwise ? 1 : -1) * t * turns * 2 * Math.PI, r = inner + (outer - inner) * t;
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  });
  return smoothPoints(raw, false);
}

const tgt = { target: targetArg.optional(), targets: targetsArg, artboard: artboardArg };
const artboardRange = z.string().regex(/^[\d,\- ]+$/).optional().describe("Range like '1-3,5' (1-based); default all");
const BATCH_EXCLUDED = new Set(["batch_operation", "get_job", "wait_for_job", "list_jobs", "cancel_job"]);

export function registerProductionTools(server: McpServer, ctx: ToolContext): void {
  const pen = async (a: Parameters<typeof common>[0], pts: Pt[], closed: boolean, p: (v: number | undefined) => number | undefined) =>
    op(ctx, "draw_pen_path", {
      ...common(a), closed,
      points: pts.map((q) => ({ x: p(q.x), y: p(q.y), in: q.in?.map((v) => p(v)), out: q.out?.map((v) => p(v)), corner: q.corner ?? (!q.in && !q.out) })),
    });

  /* ---------------- shapes ---------------- */
  defineTool(server, ctx, {
    name: "draw_triangle",
    description: "Draw a triangle inside a box (x/y = top-left, y down): isosceles (apex top-center), right (right angle bottom-left) or equilateral (height derived from width).",
    input: { kind: z.enum(["isosceles", "right", "equilateral"]).default("isosceles"), x: z.number(), y: z.number(), width: z.number().positive(), height: z.number().positive().optional(), ...style },
    annotations: WRITE,
    handler: async (a) => {
      if (a.kind !== "equilateral" && a.height === undefined) throw new McpDesignError("VALIDATION_ERROR", "height is required unless kind is equilateral");
      return pen(a, trianglePoints(a.kind, a.x, a.y, a.width, a.height ?? 0), true, P(ctx, a.units));
    },
  });

  defineTool(server, ctx, {
    name: "draw_arc",
    description: "Draw an elliptical arc as true Bezier curves. Angles in degrees, clockwise from 3 o'clock (y down). closure: open (stroke only), pie (closed to the center) or chord.",
    input: {
      cx: z.number(), cy: z.number(), radius: z.number().positive(), radiusY: z.number().positive().optional(),
      startAngle: z.number().min(-720).max(720), endAngle: z.number().min(-720).max(720), closure: z.enum(["open", "pie", "chord"]).default("open"), ...style,
    },
    annotations: WRITE,
    handler: async (a) => {
      const pts = arcPoints(a.cx, a.cy, a.radius, a.radiusY ?? a.radius, a.startAngle, a.endAngle);
      if (a.closure === "pie") pts.push({ x: a.cx, y: a.cy, corner: true });
      const args = a.closure === "open" ? { ...a, fill: a.fill ?? "none", stroke: a.stroke ?? { color: "#000000", width: 1 } } : a;
      return pen(args, pts, a.closure !== "open", P(ctx, a.units));
    },
  });

  defineTool(server, ctx, {
    name: "draw_spiral",
    description: "Draw an Archimedean spiral (open smooth path) around cx/cy from innerRadius to outerRadius over the given number of turns.",
    input: {
      cx: z.number(), cy: z.number(), outerRadius: z.number().positive(), innerRadius: z.number().min(0).default(0),
      turns: z.number().min(0.25).max(50).default(3), clockwise: z.boolean().default(true), ...style,
    },
    annotations: WRITE,
    handler: async (a) => {
      if (a.innerRadius >= a.outerRadius) throw new McpDesignError("VALIDATION_ERROR", "innerRadius must be smaller than outerRadius");
      const args = { ...a, fill: a.fill ?? "none", stroke: a.stroke ?? { color: "#000000", width: 1 } };
      return pen(args, spiralPoints(a.cx, a.cy, a.innerRadius, a.outerRadius, a.turns, a.clockwise), false, P(ctx, a.units));
    },
  });

  /* ---------------- objects ---------------- */
  defineTool(server, ctx, {
    name: "shear_objects",
    description: "Shear (skew) objects about their centers. angleX slants vertical edges (positive leans the top right); angleY slants horizontal edges.",
    input: { ...tgt, angleX: z.number().min(-89).max(89).default(0), angleY: z.number().min(-89).max(89).default(0) },
    annotations: WRITE,
    handler: async (a) => {
      if (!a.angleX && !a.angleY) throw new McpDesignError("VALIDATION_ERROR", "Give angleX and/or angleY");
      return op(ctx, "shear_objects", a);
    },
  });

  defineTool(server, ctx, {
    name: "select_all",
    description: "Select every unlocked, visible object (or only those on one artboard), or clear the selection with deselect: true.",
    input: { deselect: z.boolean().default(false), activeArtboardOnly: z.boolean().default(false), artboard: artboardArg },
    annotations: WRITE,
    handler: async (a) => op(ctx, "select_all", a),
  });

  defineTool(server, ctx, {
    name: "get_object_properties",
    description: "Full verified properties of objects: bounds, fill/stroke, text attributes, parent layer, stacking position, path area/length and transformation matrix where Illustrator exposes one.",
    input: { ...tgt, deep: z.boolean().default(false).describe("Include group children") },
    annotations: READ_ONLY,
    handler: async (a) => op(ctx, "get_object_properties", a),
  });

  /* ---------------- layers / document ---------------- */
  defineTool(server, ctx, {
    name: "duplicate_layer",
    description: "Duplicate a layer with all its objects and sublayers, placed directly above the original.",
    input: { name: z.string().min(1).max(120), newName: z.string().min(1).max(120).optional() },
    annotations: WRITE,
    handler: async (a) => op(ctx, "duplicate_layer", a),
  });

  defineTool(server, ctx, {
    name: "create_sublayer",
    description: "Create a sublayer inside an existing layer.",
    input: { parent: z.string().min(1).max(120), name: z.string().min(1).max(120), position: z.enum(["top", "bottom"]).default("top") },
    annotations: WRITE,
    handler: async (a) => op(ctx, "create_sublayer", a),
  });

  defineTool(server, ctx, {
    name: "get_document_settings",
    description: "Document settings: color mode, color profile, ruler units and origin, raster effects resolution, artboards and object counts.",
    input: {},
    annotations: READ_ONLY,
    handler: async () => op(ctx, "get_document_settings", {}),
  });

  defineTool(server, ctx, {
    name: "set_raster_effects_resolution",
    description: "Set Document Raster Effects resolution (ppi) used for shadows, blurs and other raster effects; 300 for print. Verified by reading it back.",
    input: { resolution: z.number().int().min(36).max(2400) },
    annotations: WRITE,
    handler: async (a) => op(ctx, "set_raster_effects_resolution", a),
  });

  /* ---------------- export / print ---------------- */
  defineTool(server, ctx, {
    name: "export_tiff",
    description: "Export artboards to TIFF (RGB, CMYK or grayscale) at the given resolution. Multiple artboards get numbered files.",
    input: { path: z.string().min(1), overwrite: z.boolean().default(false), ppi: z.number().min(36).max(2400).default(300), colorSpace: z.enum(["RGB", "CMYK", "Grayscale"]).default("RGB"), lzw: z.boolean().default(true), artboards: artboardRange },
    annotations: WRITE,
    handler: async (a) => op(ctx, "export_tiff", { ...a, path: ctx.paths.resolveOutput(a.path, { extensions: [".tif", ".tiff"], overwrite: a.overwrite }) }),
  });

  defineTool(server, ctx, {
    name: "export_selection",
    description: "Export only the given objects (or the selection) to PNG or SVG, cropped to their bounds plus padding. Uses a temporary document that is closed without saving; the original is untouched.",
    input: { ...tgt, path: z.string().min(1), overwrite: z.boolean().default(false), format: z.enum(["png", "svg"]).default("png"), ppi: z.number().min(18).max(1200).default(144), transparent: z.boolean().default(true), padding: z.number().min(0).max(500).default(0), units: unitsArg },
    annotations: WRITE,
    handler: async (a) => {
      const path = ctx.paths.resolveOutput(a.path, { extensions: [`.${a.format}`], overwrite: a.overwrite });
      return op(ctx, "export_selection", { ...a, units: undefined, path, padding: P(ctx, a.units)(a.padding) });
    },
  });

  defineTool(server, ctx, {
    name: "export_print_pdf",
    description: "Export a print-ready PDF: PDF/X preset (default [PDF/X-4:2008]), bleed and crop marks, optional registration marks, color bars and page info. Written as a copy; a saved .ai stays the working file (same save-first rule as export_pdf). Run preflight_document first.",
    input: {
      path: z.string().min(1), overwrite: z.boolean().default(false), preset: z.string().max(120).optional(),
      bleed: z.number().min(0).max(72).default(3).describe("Bleed on every side, in `units` (default mm)"), units: unitsArg.default("mm"),
      cropMarks: z.boolean().default(true), registrationMarks: z.boolean().default(false), colorBars: z.boolean().default(false), pageInfo: z.boolean().default(false),
      artboards: artboardRange, allowRetarget: z.boolean().default(false),
    },
    annotations: WRITE,
    handler: async (a) => {
      const path = ctx.paths.resolveOutput(a.path, { extensions: [".pdf"], overwrite: a.overwrite });
      return op(ctx, "export_print_pdf", { ...a, units: undefined, path, bleed: P(ctx, a.units)(a.bleed) });
    },
  });

  defineTool(server, ctx, {
    name: "preflight_document",
    description: "Read-only production check: stray points, unpainted paths, hairlines, small or overset text, missing fonts and links, low-resolution images, RGB colors in CMYK documents, empty and hidden layers. Returns issues by severity; passed is false when any error is found.",
    input: {
      forPrint: z.boolean().default(true), minTextSize: z.number().min(1).max(72).default(6), minStrokeWidth: z.number().min(0).max(10).default(0.25),
      minPpi: z.number().int().min(72).max(1200).default(300), limit: z.number().int().min(100).max(200000).default(20000), maxIssues: z.number().int().min(1).max(2000).default(300),
    },
    annotations: READ_ONLY,
    handler: async (a) => op(ctx, "preflight_document", a),
  });

  defineTool(server, ctx, {
    name: "cleanup_document",
    description: "Remove stray anchor points, empty text frames, unpainted paths and empty layers (locked/hidden items are left alone). dryRun (default) only lists candidates; removing requires dryRun: false and confirm: true.",
    input: {
      remove: z.array(z.enum(["stray_points", "empty_text", "unpainted_paths", "empty_layers"])).min(1).optional(),
      dryRun: z.boolean().default(true), confirm: z.boolean().optional(),
    },
    annotations: DESTRUCTIVE,
    handler: async (a) => {
      if (!a.dryRun) requireConfirm(a.confirm, "Removing objects with cleanup_document");
      return op(ctx, "cleanup_document", { remove: a.remove, dryRun: a.dryRun });
    },
  });

  /* ---------------- workflow ---------------- */
  defineTool(server, ctx, {
    name: "batch_operation",
    description: "Run a list of tool calls in order in one request ({ tool, args } each; any tool except batch/job tools). Each step is validated like a direct call and keeps its own confirm rules. Stops at the first failure unless continueOnError.",
    input: {
      steps: z.array(z.object({ tool: z.string().min(1), args: z.record(z.unknown()).default({}), label: z.string().max(120).optional() })).min(1).max(200),
      continueOnError: z.boolean().default(false),
    },
    annotations: WRITE,
    handler: async (a) => {
      for (const s of a.steps) {
        if (BATCH_EXCLUDED.has(s.tool)) throw new McpDesignError("VALIDATION_ERROR", `${s.tool} cannot be used inside batch_operation`);
        if (!toolHandlers.has(s.tool)) throw new McpDesignError("VALIDATION_ERROR", `Unknown tool in batch: ${s.tool}`);
      }
      const results: { step: number; tool: string; label?: string; ok: boolean; data?: unknown; warnings?: string[]; error?: { code: string; message: string } }[] = [];
      const warnings: string[] = [];
      let images: ToolOutput["images"];
      for (const [i, s] of a.steps.entries()) {
        try {
          const out = await toolHandlers.get(s.tool)!.run(s.args, ctx);
          results.push({ step: i + 1, tool: s.tool, label: s.label, ok: true, data: out.data, warnings: out.warnings });
          if (out.images?.length) images = out.images;
        } catch (err) {
          const e = toMcpError(err);
          results.push({ step: i + 1, tool: s.tool, label: s.label, ok: false, error: { code: e.code, message: e.message } });
          if (!a.continueOnError) { warnings.push(`Stopped at step ${i + 1} (${s.tool}); later steps were not run.`); break; }
        }
      }
      const failed = results.filter((r) => !r.ok).length;
      return { data: { completed: results.length - failed, failed, total: a.steps.length, results }, warnings, images };
    },
  });

  defineTool(server, ctx, {
    name: "generate_design_report",
    description: "Summary report of the active document for review or handoff: settings, layers, fonts, swatches, linked assets and preflight issues, as structured data plus Markdown.",
    input: { forPrint: z.boolean().default(false) },
    annotations: READ_ONLY,
    handler: async (a) => {
      const warnings: string[] = [];
      const get = async <T>(name: string, args: object = {}): Promise<T | undefined> => {
        try { const r = await ctx.bridge.run<T>(name, args); warnings.push(...r.warnings); return r.data; } catch (e) { warnings.push(`${name}: ${toMcpError(e).message}`); return undefined; }
      };
      type Settings = { name: string; path: string | null; colorMode: string; colorProfile: string | null; artboards: { name: string; width: number; height: number }[]; counts: Record<string, number>; rasterEffects: { resolution: number } | null };
      type Pre = { passed: boolean; counts: Record<string, number>; issues: { severity: string; code: string; message: string; object: string | null }[] };
      const settings = await get<Settings>("get_document_settings");
      if (!settings) throw new McpDesignError("NO_ACTIVE_DOCUMENT", warnings.join("; ") || "No document");
      const layers = await get<{ layers: { name: string; visible: boolean; locked: boolean; itemCount: number }[] }>("inspect_layers");
      const fonts = await get<{ documentFonts: string[] }>("inspect_fonts", { limit: 1, documentFonts: true });
      const swatches = await get<{ swatchCount: number; spots: { name: string }[] }>("list_swatches");
      const assets = await get<{ linked: unknown[]; embedded: unknown[]; missingLinks: string[] }>("inspect_assets");
      const pre = await get<Pre>("preflight_document", { forPrint: a.forPrint, maxIssues: 50 });
      const md = [
        `# Design report: ${settings.name}`, "",
        `- File: ${settings.path ?? "(unsaved)"}`,
        `- Color: ${settings.colorMode}${settings.colorProfile ? ` (${settings.colorProfile})` : ""}; raster effects ${settings.rasterEffects?.resolution ?? "?"} ppi`,
        `- Artboards: ${settings.artboards.map((b) => `${b.name} ${Math.round(b.width)}x${Math.round(b.height)} pt`).join(", ")}`,
        `- Objects: ${settings.counts.pageItems} (${settings.counts.textFrames} text frames)`,
        `- Layers: ${layers?.layers.map((l) => `${l.name}${l.visible ? "" : " (hidden)"}${l.locked ? " (locked)" : ""} [${l.itemCount}]`).join(", ") ?? "?"}`,
        `- Fonts used: ${fonts?.documentFonts.join(", ") || "none"}`,
        `- Swatches: ${swatches?.swatchCount ?? "?"}${swatches?.spots.length ? `; spot colors: ${swatches.spots.map((s) => s.name).join(", ")}` : ""}`,
        `- Images: ${assets ? `${assets.linked.length} linked, ${assets.embedded.length} embedded, ${assets.missingLinks.length} missing` : "?"}`,
        "", `## Preflight${a.forPrint ? " (print)" : ""}: ${pre ? (pre.passed ? "passed" : "FAILED") : "not run"}`,
        ...(pre ? [`Errors ${pre.counts.error}, warnings ${pre.counts.warning}, info ${pre.counts.info}`, "", ...pre.issues.map((i) => `- **${i.severity}** ${i.code}: ${i.message}${i.object ? ` (${i.object})` : ""}`)] : []),
      ].join("\n");
      return { data: { settings, layers: layers?.layers, fonts: fonts?.documentFonts, swatches, assets, preflight: pre, markdown: md }, warnings };
    },
  });
}
