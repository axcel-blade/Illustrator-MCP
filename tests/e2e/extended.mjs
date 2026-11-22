/**
 * End-to-end test of the extended tools (path/object ops, styles & swatches, text layout,
 * automation) against the REAL Illustrator.
 *   pnpm build && node tests/e2e/extended.mjs
 * Works only inside a new document it creates and closes; other open documents are not touched.
 * Never prints or runs actions without confirm (those paths are checked for refusal only).
 */
import { existsSync, mkdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import { connect, OUT } from "./lib.mjs";

const results = [];
const rec = (name, ok, detail) => {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : "  -> " + JSON.stringify(detail).slice(0, 600)}`);
};
const { client, call } = await connect();
async function step(name, tool, args, verify) {
  const r = await call(tool, args);
  if (r.isError || !r.body.ok || r.body.source !== "illustrator") { rec(name, false, r.body.error ?? r.body); return r.body; }
  let v;
  try { v = verify ? await verify(r.body.data, r.body) : true; } catch (e) { v = String(e); }
  rec(name, v === true, v);
  return r.body;
}
const must = async (tool, args) => { const r = await call(tool, args); if (r.isError || !r.body.ok) rec(`setup ${tool} ${args.name ?? ""}`, false, r.body); return r; };
const near = (a, b, t = 0.8) => Math.abs(a - b) <= t;
const items = async () => (await call("inspect_document", { deep: true, limit: 1000 })).body.data?.items ?? [];
const find = async (n) => (await items()).find((i) => i.name === n);
const exists = (p) => existsSync(p) && statSync(p).size > 0;

mkdirSync(OUT, { recursive: true });
const DOC = `mcp-extended-${Date.now()}`;
await step("create test document", "create_document", { name: DOC, width: 800, height: 600 });

/* ================= path & object ops ================= */
await must("draw_rectangle", { x: 50, y: 50, width: 100, height: 100, name: "Sq", fill: "#2F80ED" });
await step("offset path +10 keeps original", "offset_path", { targets: [{ name: "Sq" }], offset: 10, name: "SqOff" }, async (d) => {
  const o = d.items[0]; const src = await find("Sq");
  return near(o.bounds.width, 120, 1.5) && near(o.bounds.x, 40, 1.5) && !!src || { o, src };
});
await step("offset path inward -10", "offset_path", { targets: [{ name: "Sq" }], offset: -10, name: "SqIn" }, (d) => near(d.items[0].bounds.width, 80, 1.5) || d.items[0].bounds);

await must("draw_line", { x1: 200, y1: 100, x2: 400, y2: 100, name: "Ln", stroke: { color: "#000000", width: 10 } });
await must("draw_rectangle", { x: 200, y: 140, width: 100, height: 40, name: "Ring", fill: "none", stroke: { color: "#00AA00", width: 8 } });
await step("outline stroke closed path -> ring", "outline_stroke", { targets: [{ name: "Ring" }], name: "RingOut" }, (d) => {
  const o = d.items[0]; return near(o.bounds.width, 108, 1) && near(o.bounds.height, 48, 1) && !o.stroke || o;
});
await step("outline stroke -> filled path", "outline_stroke", { targets: [{ name: "Ln" }], name: "LnOut" }, (d) => {
  const o = d.items[0]; return o.fill && !o.stroke && near(o.bounds.height, 10, 1) && near(o.bounds.width, 200, 1) || o;
});

await must("draw_ellipse", { x: 450, y: 50, width: 80, height: 80, name: "Dot", fill: "#FF0000" });
await must("apply_shadow", { targets: [{ name: "Dot" }] });
await step("expand appearance", "expand_objects", { targets: [{ name: "Dot" }], mode: "appearance", name: "DotX" }, (d) => d.items.length >= 1 || d);

await must("draw_circle", { cx: 80, cy: 300, radius: 20, name: "B1", fill: "#FF0000" });
await must("draw_circle", { cx: 300, cy: 300, radius: 40, name: "B2", fill: "#0000FF" });
await step("create blend (live)", "create_blend", { targets: [{ name: "B1" }, { name: "B2" }], name: "Blend" }, (d) => d.items[0].type === "PluginItem" || d.items[0].type === "GroupItem" || d.items[0]);
await step("release blend", "release_blend", { targets: [{ name: "Blend" }] }, (d) => d.count >= 2 || d);
await call("delete_object", { targets: "selection", confirm: true }).catch(() => undefined);
await must("draw_circle", { cx: 80, cy: 420, radius: 20, name: "C1", fill: "#00AA00" });
await must("draw_circle", { cx: 300, cy: 420, radius: 20, name: "C2", fill: "#AA00AA" });
await step("create blend + expand -> paths", "create_blend", { targets: [{ name: "C1" }, { name: "C2" }], expand: true, name: "BlendX" }, (d) => d.items[0].type === "GroupItem" && d.items[0].childCount > 2 || d.items[0]);


await must("draw_rectangle", { x: 450, y: 350, width: 80, height: 80, name: "MaskShape" });
await must("draw_rectangle", { x: 430, y: 330, width: 140, height: 140, name: "MaskBody", fill: "#00FFAA" });
await must("create_clipping_mask", { mask: { name: "MaskShape" }, targets: [{ name: "MaskBody" }], name: "Clip" });
await step("release clipping mask", "release_clipping_mask", { targets: [{ name: "Clip" }] }, async () => (!(await find("Clip")) && (await find("MaskBody")) ? true : "clip group still there"));

await must("draw_rectangle", { x: 600, y: 450, width: 60, height: 60, name: "K1" });
await must("draw_rectangle", { x: 615, y: 465, width: 30, height: 30, name: "K2" });
await must("create_compound_path", { targets: [{ name: "K1" }, { name: "K2" }], name: "Comp" });
await step("release compound path", "release_compound_path", { targets: [{ name: "Comp" }] }, (d) => d.count === 2 || d);
{ const r = await call("release_compound_path", { targets: [{ name: "Sq" }] }); rec("release compound on plain path -> VALIDATION_ERROR", r.body.error?.code === "VALIDATION_ERROR", r.body); }

/* ================= styles & swatches ================= */
await call("create_layer", { name: "Text" });
await must("add_text", { name: "Head", content: "Hello Styles", x: 50, y: 520, fontSize: 20, color: "#000000", layer: "Text" });
await step("create character style", "create_text_style", { kind: "character", name: "MCP Accent", character: { fontSize: 32, color: "#CC0044", tracking: 100 } }, (d) => d.name === "MCP Accent" || d);
await step("create paragraph style", "create_text_style", { kind: "paragraph", name: "MCP Body", character: { fontSize: 12 }, paragraph: { align: "center", spaceAfter: 6 } }, (d) => d.name === "MCP Body" || d);
await step("apply character style", "apply_text_style", { target: { name: "Head" }, kind: "character", style: "MCP Accent" }, async () => {
  const i = await find("Head"); return i.fontSize === 32 && i.tracking === 100 && /CC004[3-5]/i.test(JSON.stringify(i.fill)) || i;
});
await step("apply paragraph style", "apply_text_style", { target: { name: "Head" }, kind: "paragraph", style: "MCP Body" }, async () => {
  const i = await find("Head"); return /CENTER/i.test(i.justification) || i;
});
await step("list styles", "list_styles", {}, (d) => d.characterStyles.includes("MCP Accent") && d.paragraphStyles.includes("MCP Body") && Array.isArray(d.graphicStyles) && Array.isArray(d.brushes) || d);
const styles = (await call("list_styles")).body.data ?? {};
const gs = (styles.graphicStyles ?? []).find((n) => n !== "[Default]");
if (gs) await step(`apply graphic style "${gs}"`, "apply_graphic_style", { targets: [{ name: "Sq" }], style: gs }, (d) => d.count === 1 || d);
else rec("apply graphic style (document has no non-default graphic style)", true);
const br = (styles.brushes ?? [])[0];
if (br) {
  await must("draw_line", { x1: 50, y1: 560, x2: 300, y2: 560, name: "BrushLine", stroke: { color: "#000000", width: 1 } });
  await step(`apply brush "${br}"`, "apply_brush", { targets: [{ name: "BrushLine" }], brush: br }, (d) => d.count === 1 || d);
} else rec("apply brush (document has no brushes)", true);
{ const r = await call("apply_brush", { targets: [{ name: "Sq" }], brush: "No Such Brush" }); rec("unknown brush -> OBJECT_NOT_FOUND", r.body.error?.code === "OBJECT_NOT_FOUND", r.body); }

await step("create spot color + apply 50% tint", "create_spot_color", { name: "MCP Spot Orange", color: "#FF6600", targets: [{ name: "SqIn" }], tint: 50 }, (d) => d.type === "spot" && d.applied === 1 || d);
await step("create swatch group", "create_swatch_group", { name: "MCP Brand", colors: [{ name: "MCP Navy", color: "#0B1F3A" }, { name: "MCP Sky", color: "#2F80ED" }] }, (d) => d.swatches.length === 2 || d);
await step("list swatches", "list_swatches", {}, (d) => d.groups.some((g) => g.name === "MCP Brand") && d.spots.some((s) => s.name === "MCP Spot Orange") || d);

await must("draw_star", { cx: 700, cy: 80, radius: 30, innerRadius: 12, name: "StarSrc", fill: "#FFCC00" });
await must("create_symbol", { target: { name: "StarSrc" }, name: "MCP Star" });
await step("place symbol instance", "place_symbol", { symbol: "MCP Star", x: 650, y: 150, width: 40, name: "StarInst" }, (d) => d.type === "SymbolItem" && near(d.bounds.x, 650) && near(d.bounds.width, 40, 1) || d);

/* ================= text layout ================= */
const lorem = "Illustrator area text wraps inside its frame. ".repeat(30);
await step("create area text (2 columns)", "create_area_text", { name: "Area1", content: lorem, x: 50, y: 170, width: 300, height: 80, columns: 2, gutter: 12, character: { fontSize: 10 }, paragraph: { align: "justify" } },
  (d) => d.textKind.includes("AREA") && d.overflow === true || d);
await must("create_area_text", { name: "Area2", content: "", x: 380, y: 170, width: 300, height: 300 });
await step("thread overflow into second frame", "thread_text_frames", { targets: [{ name: "Area1" }, { name: "Area2" }] }, (d) => d.items[0].overflow === false || d.items);
await step("set text columns", "set_text_columns", { target: { name: "Area2" }, columns: 3, columnGutter: 10 }, (d) => d.columns === 3 || d);
await step("set character range attributes", "set_text_attributes", { target: { name: "Head" }, range: { start: 0, length: 5 }, character: { baselineShift: 4, horizontalScale: 120, underline: true, capitalization: "allCaps" } },
  (d) => d.attributes.baselineShift === 4 && d.attributes.horizontalScale === 120 && d.attributes.underline === true || d.attributes);
await step("set paragraph attributes + tabs", "set_text_attributes", { target: { name: "Area1" }, paragraph: { firstLineIndent: 12, spaceBefore: 4, tabStops: [{ position: 72, align: "left" }] }, character: { kerning: "optical", ligatures: true } }, (d) => !!d.attributes || d);
await step("find & replace keeps styles", "find_replace_text", { find: "hello", replace: "Howdy" }, async (d) => {
  const i = await find("Head"); return d.replacements === 1 && i.contents === "Howdy Styles" && i.fontSize === 32 || { d, i };
});
{ const r = await call("set_text_attributes", { target: { name: "Head" }, range: { start: 999, length: 1 }, character: { underline: true } }); rec("out-of-range text range -> VALIDATION_ERROR", r.body.error?.code === "VALIDATION_ERROR", r.body); }

/* ================= automation ================= */
await step("bind text variable", "bind_variable", { target: { name: "Head" }, variable: "headline" }, (d) => d.variables.some((v) => v.name === "headline" && v.boundTo.includes("Head")) || d);
await step("capture data set A", "capture_dataset", { name: "SetA" }, (d) => d.dataSets.includes("SetA") || d);
await must("edit_text", { target: { name: "Head" }, content: "Changed" });
await step("apply data set restores text", "apply_dataset", { name: "SetA" }, async () => ((await find("Head")).contents === "Howdy Styles" ? true : await find("Head")));
await step("list variables", "list_variables", {}, (d) => d.variables.length >= 1 && d.dataSets.includes("SetA") || d);

const merge = join(OUT, "extended-merge");
rmSync(merge, { recursive: true, force: true });
await step("data merge export (2 rows)", "data_merge_export", { rows: [{ Head: "Alpha", file: "alpha" }, { Head: "Beta", file: "beta" }], folder: merge, fileNameKey: "file", format: "png", ppi: 36 },
  async (d) => (d.count === 2 && exists(join(merge, "alpha.png")) && exists(join(merge, "beta.png")) && (await find("Head")).contents === "Howdy Styles" ? true : d));

await call("create_artboard", { name: "Second", x: 900, y: 0, width: 300, height: 200 });
await must("draw_rectangle", { x: 20, y: 20, width: 100, height: 50, name: "OnSecond", artboard: 1, fill: "#333333" });
{ const vb = (await find("OnSecond")).visibleBounds;
  await step("fit artboard to artwork (+10 pad)", "fit_artboard_to_artwork", { artboard: 1, padding: 10 }, (d) => near(d.width, vb.width + 20, 1) && near(d.height, vb.height + 20, 1) || { d, vb }); }
const batch = join(OUT, "extended-artboards");
rmSync(batch, { recursive: true, force: true });
await step("export artboards (png+svg)", "export_artboards", { folder: batch, prefix: "ab", formats: ["png", "svg"], ppi: 36 },
  (d) => d.count === 4 && exists(join(batch, "ab-Second.png")) || d);

{ const r = await call("run_action", { action: "Opacity 60 (selection)", set: "Default Actions" }); rec("run_action without confirm -> CONFIRMATION_REQUIRED", r.body.error?.code === "CONFIRMATION_REQUIRED", r.body); }
await step("run default action with confirm", "run_action", { action: "Opacity 60 (selection)", set: "Default Actions", targets: [{ name: "Sq" }], confirm: true },
  async () => { const i = await find("Sq"); return near(i.opacity, 60, 1) || i; });
{ const r = await call("print_document", {}); rec("print without confirm -> CONFIRMATION_REQUIRED", r.body.error?.code === "CONFIRMATION_REQUIRED", r.body); }

await call("generate_export_preview", { artboard: 0, maxWidthPx: 800 });
await call("save_document_as", { path: join(OUT, "extended-test.ai"), overwrite: true });
await call("close_document", { save: false, confirm: true });
await client.close();
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
