import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { join } from "node:path";
import { z } from "zod";
import { HexColorSchema } from "../../utils/colors.js";
import { McpDesignError } from "../../utils/errors.js";
import {
  artboardArg, color, DESTRUCTIVE, defineTool, layerArg, nameArg, op, P, READ_ONLY, requireConfirm, targetArg, targetsArg, unitsArg, WRITE,
  type ToolContext, type ToolOutput,
} from "./common.js";

/* ---------------- shared text schemas ---------------- */

/** Character attributes; sizes in points. */
export const CharacterSchema = z.object({
  font: z.string().min(1).max(200).optional().describe("PostScript name or 'Family Style'"),
  fontSize: z.number().min(0.1).max(1296).optional(),
  color: HexColorSchema.optional(),
  tracking: z.number().min(-1000).max(10000).optional().describe("1/1000 em"),
  kerning: z.enum(["auto", "optical", "none"]).optional(),
  leading: z.number().min(0).max(5000).optional(),
  autoLeading: z.boolean().optional(),
  baselineShift: z.number().min(-1296).max(1296).optional(),
  horizontalScale: z.number().min(1).max(10000).optional().describe("Percent"),
  verticalScale: z.number().min(1).max(10000).optional().describe("Percent"),
  rotation: z.number().min(-360).max(360).optional().describe("Per-character rotation"),
  underline: z.boolean().optional(),
  strikeThrough: z.boolean().optional(),
  capitalization: z.enum(["normal", "allCaps", "smallCaps", "allSmallCaps"]).optional(),
  position: z.enum(["normal", "superscript", "subscript"]).optional(),
  ligatures: z.boolean().optional(),
  discretionaryLigatures: z.boolean().optional(),
  fractions: z.boolean().optional(),
  ordinals: z.boolean().optional(),
  swash: z.boolean().optional(),
  stylisticAlternates: z.boolean().optional(),
  figureStyle: z.enum(["default", "tabularLining", "proportionalOldstyle", "proportionalLining", "tabularOldstyle"]).optional(),
}).strict();

export const ParagraphSchema = z.object({
  align: z.enum(["left", "center", "right", "justify", "justifyAll"]).optional(),
  firstLineIndent: z.number().min(-1296).max(1296).optional(),
  leftIndent: z.number().min(0).max(1296).optional(),
  rightIndent: z.number().min(0).max(1296).optional(),
  spaceBefore: z.number().min(0).max(1296).optional(),
  spaceAfter: z.number().min(0).max(1296).optional(),
  hyphenation: z.boolean().optional(),
  tabStops: z.array(z.object({
    position: z.number().min(0).max(10000),
    align: z.enum(["left", "center", "right", "decimal"]).default("left"),
    leader: z.string().max(2).optional(),
  })).max(50).optional(),
}).strict();

type Char = z.infer<typeof CharacterSchema>;
const char = (c?: Char) => (c ? { ...c, color: color(c.color) } : undefined);

const range = z.object({ start: z.number().int().min(0), length: z.number().int().min(1) }).optional()
  .describe("Character range inside the frame; default whole frame");

export function registerExtendedTools(server: McpServer, ctx: ToolContext): void {
  /* ======================= path & object ops ======================= */
  defineTool(server, ctx, {
    name: "offset_path",
    description: "Offset Path: create a path offset outward (positive) or inward (negative) from each target. Keeps the originals unless replace: true. Result is expanded vector paths.",
    input: { targets: targetsArg, offset: z.number().min(-1000).max(1000), join: z.enum(["miter", "round", "bevel"]).default("miter"), miterLimit: z.number().min(1).max(500).default(4), replace: z.boolean().default(false), name: nameArg, units: unitsArg },
    annotations: WRITE,
    handler: async (a) => op(ctx, "offset_path", { ...a, units: undefined, offset: P(ctx, a.units)(a.offset) }),
  });

  defineTool(server, ctx, {
    name: "outline_stroke",
    description: "Outline Stroke: convert each target's stroke into a filled path (Object > Path > Outline Stroke).",
    input: { targets: targetsArg, name: nameArg },
    annotations: WRITE,
    handler: async (a) => op(ctx, "outline_stroke", a),
  });

  defineTool(server, ctx, {
    name: "expand_objects",
    description: "Expand targets. mode 'appearance' flattens live effects (Expand Appearance); 'full' also expands fills/strokes, symbols, blends and envelopes into plain paths.",
    input: { targets: targetsArg, mode: z.enum(["appearance", "full"]).default("full"), name: nameArg },
    annotations: WRITE,
    handler: async (a) => op(ctx, "expand_objects", a),
  });

  defineTool(server, ctx, {
    name: "create_blend",
    description: "Make a blend between 2+ objects (Object > Blend > Make, smooth color steps). expand: true turns it into separate editable paths.",
    input: { targets: z.array(targetArg).min(2).max(100), expand: z.boolean().default(false), name: nameArg },
    annotations: WRITE,
    handler: async (a) => op(ctx, "create_blend", a),
  });

  defineTool(server, ctx, {
    name: "release_blend",
    description: "Release a blend back into its original objects.",
    input: { targets: targetsArg },
    annotations: WRITE,
    handler: async (a) => op(ctx, "release_blend", a),
  });

  defineTool(server, ctx, {
    name: "warp_objects",
    description: "Apply an Effect > Warp style (arc, arch, bulge, flag, wave, fish, rise, fisheye, inflate, squeeze, twist, ...) as a live effect; expand: true bakes it into paths.",
    input: {
      targets: targetsArg,
      style: z.enum(["arc", "arcLower", "arcUpper", "arch", "bulge", "shellLower", "shellUpper", "flag", "wave", "fish", "rise", "fisheye", "inflate", "squeeze", "twist"]),
      bend: z.number().min(-100).max(100).default(50).describe("Percent"),
      distortHorizontal: z.number().min(-100).max(100).default(0),
      distortVertical: z.number().min(-100).max(100).default(0),
      vertical: z.boolean().default(false),
      expand: z.boolean().default(false),
      name: nameArg,
    },
    annotations: WRITE,
    handler: async (a) => op(ctx, "warp_objects", a),
  });

  defineTool(server, ctx, {
    name: "release_clipping_mask",
    description: "Release a clipping group: the mask path and contents become ordinary objects again.",
    input: { targets: targetsArg },
    annotations: WRITE,
    handler: async (a) => op(ctx, "release_clipping_mask", a),
  });

  defineTool(server, ctx, {
    name: "release_compound_path",
    description: "Release a compound path into its separate paths.",
    input: { targets: targetsArg },
    annotations: WRITE,
    handler: async (a) => op(ctx, "release_compound_path", a),
  });

  /* ======================= styles & swatches ======================= */
  defineTool(server, ctx, {
    name: "create_text_style",
    description: "Create or update a named character or paragraph style (sizes in pt). Paragraph styles take both character and paragraph attributes.",
    input: { kind: z.enum(["character", "paragraph"]), name: z.string().min(1).max(120), character: CharacterSchema.optional(), paragraph: ParagraphSchema.optional() },
    annotations: WRITE,
    handler: async (a) => {
      if (a.kind === "character" && a.paragraph) throw new McpDesignError("VALIDATION_ERROR", "Character styles cannot hold paragraph attributes.");
      return op(ctx, "create_text_style", { ...a, character: char(a.character) });
    },
  });

  defineTool(server, ctx, {
    name: "apply_text_style",
    description: "Apply a named character or paragraph style to text frames (clears local overrides unless clearOverrides: false).",
    input: { target: targetArg, kind: z.enum(["character", "paragraph"]), style: z.string().min(1).max(120), clearOverrides: z.boolean().default(true) },
    annotations: WRITE,
    handler: async (a) => op(ctx, "apply_text_style", a),
  });

  defineTool(server, ctx, {
    name: "list_styles",
    description: "List the document's character styles, paragraph styles, graphic styles, brushes and symbols.",
    input: {},
    annotations: READ_ONLY,
    handler: async () => op(ctx, "list_styles", {}),
  });

  defineTool(server, ctx, {
    name: "apply_graphic_style",
    description: "Apply a graphic style from the Graphic Styles panel to objects (merge: true adds it on top of the current appearance).",
    input: { targets: targetsArg, style: z.string().min(1).max(200), merge: z.boolean().default(false) },
    annotations: WRITE,
    handler: async (a) => op(ctx, "apply_graphic_style", a),
  });

  defineTool(server, ctx, {
    name: "apply_brush",
    description: "Apply a brush from the document's Brushes panel (calligraphic, art, pattern, bristle, scatter) to paths.",
    input: { targets: targetsArg, brush: z.string().min(1).max(200) },
    annotations: WRITE,
    handler: async (a) => op(ctx, "apply_brush", a),
  });

  defineTool(server, ctx, {
    name: "create_spot_color",
    description: "Create (or update) a named spot or global process color swatch; optionally apply it with a tint to targets' fill or stroke.",
    input: {
      name: z.string().min(1).max(120), color: HexColorSchema, process: z.boolean().default(false).describe("true = global process color instead of spot"),
      targets: targetsArg, applyTo: z.enum(["fill", "stroke"]).default("fill"), tint: z.number().min(0).max(100).default(100),
    },
    annotations: WRITE,
    handler: async (a) => op(ctx, "create_spot_color", { ...a, color: color(a.color) }),
  });

  defineTool(server, ctx, {
    name: "create_swatch_group",
    description: "Create a named swatch group (color group) containing the given colors.",
    input: { name: z.string().min(1).max(120), colors: z.array(z.object({ name: z.string().min(1).max(120), color: HexColorSchema })).min(1).max(100) },
    annotations: WRITE,
    handler: async (a) => op(ctx, "create_swatch_group", { ...a, colors: a.colors.map((c) => ({ name: c.name, color: color(c.color) })) }),
  });

  defineTool(server, ctx, {
    name: "list_swatches",
    description: "List swatch groups, their swatches and the spot/global colors in the document.",
    input: {},
    annotations: READ_ONLY,
    handler: async () => op(ctx, "list_swatches", {}),
  });

  defineTool(server, ctx, {
    name: "place_symbol",
    description: "Place an instance of a document symbol at x/y (top-left, artboard origin, y down), optionally resized.",
    input: { symbol: z.string().min(1).max(200), x: z.number(), y: z.number(), width: z.number().positive().optional(), height: z.number().positive().optional(), name: nameArg, layer: layerArg, artboard: artboardArg, units: unitsArg },
    annotations: WRITE,
    handler: async (a) => {
      const p = P(ctx, a.units);
      return op(ctx, "place_symbol", { ...a, units: undefined, x: p(a.x), y: p(a.y), width: p(a.width), height: p(a.height) });
    },
  });

  /* ======================= text layout ======================= */
  defineTool(server, ctx, {
    name: "create_area_text",
    description: "Create area (paragraph) text that wraps inside a box, with optional columns/rows and character/paragraph attributes. Reports overflow.",
    input: {
      content: z.string().max(100000), x: z.number(), y: z.number(), width: z.number().positive(), height: z.number().positive(),
      columns: z.number().int().min(1).max(50).optional(), rows: z.number().int().min(1).max(50).optional(), gutter: z.number().min(0).optional(),
      character: CharacterSchema.optional(), paragraph: ParagraphSchema.optional(), name: nameArg, layer: layerArg, artboard: artboardArg, units: unitsArg,
    },
    annotations: WRITE,
    handler: async (a) => {
      const p = P(ctx, a.units);
      return op(ctx, "create_area_text", { ...a, units: undefined, x: p(a.x), y: p(a.y), width: p(a.width), height: p(a.height), gutter: p(a.gutter), character: char(a.character) });
    },
  });

  defineTool(server, ctx, {
    name: "thread_text_frames",
    description: "Thread area text frames in order so overflow text flows from each frame into the next.",
    input: { targets: z.array(targetArg).min(2).max(50) },
    annotations: WRITE,
    handler: async (a) => op(ctx, "thread_text_frames", a),
  });

  defineTool(server, ctx, {
    name: "set_text_columns",
    description: "Set rows/columns and gutters of area text (Type > Area Type Options).",
    input: { target: targetArg, columns: z.number().int().min(1).max(50).optional(), rows: z.number().int().min(1).max(50).optional(), columnGutter: z.number().min(0).optional(), rowGutter: z.number().min(0).optional(), units: unitsArg },
    annotations: WRITE,
    handler: async (a) => {
      const p = P(ctx, a.units);
      return op(ctx, "set_text_columns", { ...a, units: undefined, columnGutter: p(a.columnGutter), rowGutter: p(a.rowGutter) });
    },
  });

  defineTool(server, ctx, {
    name: "set_text_attributes",
    description: "Set detailed character attributes (tracking, kerning, leading, baseline shift, scale, caps, super/subscript, OpenType ligatures/fractions/figures...) and paragraph attributes (indents, spacing, hyphenation, tab stops) on a frame or a character range. Values in pt.",
    input: { target: targetArg, range, character: CharacterSchema.optional(), paragraph: ParagraphSchema.optional() },
    annotations: WRITE,
    handler: async (a) => {
      if (!a.character && !a.paragraph) throw new McpDesignError("VALIDATION_ERROR", "Provide character and/or paragraph attributes.");
      return op(ctx, "set_text_attributes", { ...a, character: char(a.character) });
    },
  });

  defineTool(server, ctx, {
    name: "find_replace_text",
    description: "Find and replace text across all text frames (or the given targets), keeping surrounding formatting. Plain-text match.",
    input: { find: z.string().min(1).max(1000), replace: z.string().max(10000), caseSensitive: z.boolean().default(false), targets: targetsArg },
    annotations: WRITE,
    handler: async (a) => op(ctx, "find_replace_text", a),
  });

  /* ======================= automation ======================= */
  defineTool(server, ctx, {
    name: "run_action",
    description: "Play a recorded Illustrator action (Actions panel) by action and set name, optionally on selected targets. Actions can do anything the user recorded; confirm with the user first.",
    input: { action: z.string().min(1).max(200), set: z.string().min(1).max(200), targets: targetsArg, confirm: z.boolean().optional() },
    annotations: DESTRUCTIVE,
    handler: async (a) => {
      requireConfirm(a.confirm, `Running action "${a.action}" from set "${a.set}"`);
      return op(ctx, "run_action", { ...a, confirm: undefined });
    },
  });

  defineTool(server, ctx, {
    name: "fit_artboard_to_artwork",
    description: "Resize an artboard to fit its artwork (or the given targets), with optional padding.",
    input: { artboard: artboardArg, targets: targetsArg, padding: z.number().min(0).max(10000).default(0), units: unitsArg },
    annotations: WRITE,
    handler: async (a) => op(ctx, "fit_artboard_to_artwork", { ...a, units: undefined, padding: P(ctx, a.units)(a.padding) }),
  });

  defineTool(server, ctx, {
    name: "export_artboards",
    description: "Batch-export every artboard (or listed ones) to separate files in a folder, one file per artboard per format, named <prefix>-<artboard name>.<ext>.",
    input: {
      folder: z.string().min(1), prefix: z.string().regex(/^[\w-]{0,60}$/).default("artboard"),
      formats: z.array(z.enum(["png", "jpg", "svg", "pdf"])).min(1).max(4), artboards: z.array(z.number().int().min(0)).max(500).optional(),
      ppi: z.number().min(18).max(558).default(144), overwrite: z.boolean().default(false),
    },
    annotations: WRITE,
    handler: async (a) => {
      const ab = (await ctx.bridge.run<{ artboards: { index: number; name: string }[] }>("get_artboards", {})).data.artboards;
      const pick = a.artboards ? ab.filter((x) => a.artboards!.includes(x.index)) : ab;
      if (!pick.length) throw new McpDesignError("VALIDATION_ERROR", "No matching artboards.");
      const files: unknown[] = [], warnings: string[] = [];
      for (const board of pick) {
        const safe = board.name.replace(/[^\w-]+/g, "-").replace(/^-+|-+$/g, "") || `ab${board.index + 1}`;
        for (const f of a.formats) {
          const path = ctx.paths.resolveOutput(join(a.folder, `${a.prefix}-${safe}.${f}`), { extensions: [`.${f}`], overwrite: a.overwrite });
          const args: Record<string, unknown> = { path, ppi: a.ppi, transparent: f === "png" };
          if (f === "png" || f === "jpg") args.artboards = [board.index];
          else if (f === "svg") args.artboard = board.index;
          else { args.artboards = String(board.index + 1); args.allowRetarget = true; }
          const r = await ctx.bridge.run<{ files?: unknown[] }>(`export_${f}`, args);
          files.push({ artboard: board.index, name: board.name, format: f, files: r.data?.files ?? [path] });
          warnings.push(...r.warnings);
        }
      }
      return { data: { count: files.length, exports: files }, warnings };
    },
  });

  defineTool(server, ctx, {
    name: "data_merge_export",
    description: "Data merge: for each row, set named text frames' contents (row keys = text object names), export a PNG/JPG/PDF per row, then restore the original text.",
    input: {
      rows: z.array(z.record(z.string().max(120), z.string().max(10000))).min(1).max(500),
      folder: z.string().min(1), fileNameKey: z.string().optional().describe("Row key used for each file name; default row-N"),
      format: z.enum(["png", "jpg", "pdf"]).default("png"), ppi: z.number().min(18).max(558).default(144), overwrite: z.boolean().default(false),
    },
    annotations: WRITE,
    handler: async (a): Promise<ToolOutput> => {
      const keys = [...new Set(a.rows.flatMap((r) => Object.keys(r)))];
      const originals = new Map<string, string>();
      const items = (await ctx.bridge.run<{ items: { name: string; type: string; contents?: string }[] }>("inspect_document", { deep: true, limit: 2000 })).data.items ?? [];
      for (const k of keys) {
        const it = items.find((i) => i.name === k && i.type === "TextFrame");
        if (it) originals.set(k, it.contents ?? "");
      }
      if (!originals.size) throw new McpDesignError("OBJECT_NOT_FOUND", "No row key matches a text frame name.");
      const out: unknown[] = [], warnings: string[] = [];
      try {
        for (let i = 0; i < a.rows.length; i++) {
          const row = a.rows[i]!;
          for (const [k, v] of Object.entries(row)) if (originals.has(k)) await ctx.bridge.run("edit_text", { target: { name: k }, content: v });
          const base = (a.fileNameKey && row[a.fileNameKey] ? row[a.fileNameKey]! : `row-${i + 1}`).replace(/[^\w-]+/g, "-").slice(0, 80);
          const path = ctx.paths.resolveOutput(join(a.folder, `${base}.${a.format}`), { extensions: [`.${a.format}`], overwrite: a.overwrite });
          const r = await ctx.bridge.run<{ files?: unknown[] }>(`export_${a.format}`, a.format === "pdf" ? { path, allowRetarget: true } : { path, ppi: a.ppi, transparent: false });
          out.push({ row: i, files: r.data?.files ?? [path] });
          warnings.push(...r.warnings);
        }
      } finally {
        for (const [k, v] of originals) await ctx.bridge.run("edit_text", { target: { name: k }, content: v }).catch(() => undefined);
      }
      return { data: { count: out.length, fields: [...originals.keys()], exports: out }, warnings };
    },
  });

  defineTool(server, ctx, {
    name: "bind_variable",
    description: "Bind an Illustrator variable (Variables panel) to an object: 'text' binds a text frame's content, 'visibility' binds visibility. Creates the variable if missing.",
    input: { target: targetArg, variable: z.string().regex(/^[A-Za-z_][\w]{0,60}$/), kind: z.enum(["text", "visibility"]).default("text") },
    annotations: WRITE,
    handler: async (a) => op(ctx, "bind_variable", a),
  });

  defineTool(server, ctx, {
    name: "list_variables",
    description: "List Illustrator variables, what they are bound to, and saved data sets.",
    input: {},
    annotations: READ_ONLY,
    handler: async () => op(ctx, "list_variables", {}),
  });

  defineTool(server, ctx, {
    name: "capture_dataset",
    description: "Capture the current values of all variables as a named data set.",
    input: { name: z.string().min(1).max(120).optional() },
    annotations: WRITE,
    handler: async (a) => op(ctx, "capture_dataset", a),
  });

  defineTool(server, ctx, {
    name: "apply_dataset",
    description: "Display a saved data set (sets every bound object to that data set's values).",
    input: { name: z.string().min(1).max(120) },
    annotations: WRITE,
    handler: async (a) => op(ctx, "apply_dataset", a),
  });

  defineTool(server, ctx, {
    name: "print_document",
    description: "Print the active document to a printer (physical output). Ask the user first and pass confirm: true.",
    input: { printer: z.string().min(1).max(200).optional(), copies: z.number().int().min(1).max(100).default(1), confirm: z.boolean().optional() },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    handler: async (a) => {
      requireConfirm(a.confirm, "Printing");
      return op(ctx, "print_document", { ...a, confirm: undefined });
    },
  });
}
