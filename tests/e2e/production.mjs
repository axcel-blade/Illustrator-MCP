/**
 * Live check of the P4 tools against the REAL Illustrator: shapes, shear, selection, properties,
 * layers, document settings, TIFF / selection / print-PDF export, preflight, cleanup, batch and report.
 * Run after `pnpm build`:  node tests/e2e/production.mjs
 */
import { existsSync, mkdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import { connect, OUT } from "./lib.mjs";

mkdirSync(OUT, { recursive: true });
const { client, call } = await connect();
const results = [];
const check = (name, ok, detail = "") => { results.push(!!ok); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  - " + detail : ""}`); };
const err = (r) => r.body.error ? `${r.body.error.code}: ${r.body.error.message}` : "";
const fileOk = (p) => existsSync(p) && statSync(p).size > 0;
const files = ["p4.ai", "p4.tif", "p4-sel.png", "p4-sel.svg", "p4-print.pdf"].map((f) => join(OUT, f));
for (const f of files) rmSync(f, { force: true });
const [AI, TIF, SELPNG, SELSVG, PDF] = files;
const U = { units: "px" };

try {
  const d = await call("create_document", { name: "P4 Test", width: 600, height: 400, units: "px", colorMode: "CMYK" });
  check("create CMYK document", d.body.ok && d.body.source === "illustrator", err(d));

  const tri = await call("draw_triangle", { ...U, name: "Tri", x: 20, y: 20, width: 100, height: 80, fill: "#4F46E5", layer: "Shapes" });
  check("draw_triangle", tri.body.ok && tri.body.data.pointCount === 3, err(tri) || `${tri.body.data?.pointCount} points, ${JSON.stringify(tri.body.data?.bounds)}`);
  const arc = await call("draw_arc", { ...U, name: "Arc", cx: 220, cy: 70, radius: 50, startAngle: 180, endAngle: 360, stroke: { color: "#06B6D4", width: 4 }, layer: "Shapes" });
  const ab = arc.body.data?.bounds;
  check("draw_arc (top half circle)", arc.body.ok && Math.abs(ab.width - 100) < 1 && Math.abs(ab.height - 50) < 1, err(arc) || JSON.stringify(ab));
  const pie = await call("draw_arc", { ...U, name: "Pie", cx: 340, cy: 70, radius: 50, startAngle: 0, endAngle: 270, closure: "pie", fill: "#F59E0B", layer: "Shapes" });
  check("draw_arc pie", pie.body.ok && pie.body.data.closed === true, err(pie));
  const sp = await call("draw_spiral", { ...U, name: "Spiral", cx: 480, cy: 70, outerRadius: 50, innerRadius: 4, turns: 3, layer: "Shapes" });
  check("draw_spiral", sp.body.ok && sp.body.data.closed === false && sp.body.data.pointCount > 40, err(sp) || `${sp.body.data?.pointCount} points`);

  await call("draw_rectangle", { ...U, name: "Box", x: 20, y: 200, width: 100, height: 100, fill: "#0F172A", layer: "Shapes" });
  const sh = await call("shear_objects", { targets: [{ name: "Box" }], angleX: 20 });
  const sb = sh.body.data?.items?.[0]?.bounds;
  check("shear_objects widens the box", sh.body.ok && sb.width > 130 && Math.abs(sb.height - 100) < 1, err(sh) || JSON.stringify(sb));

  const all = await call("select_all", {});
  check("select_all", all.body.ok && all.body.data.selected === 5, err(all) || `${all.body.data?.selected} selected`);
  const none = await call("select_all", { deselect: true });
  check("deselect", none.body.ok && none.body.data.selected === 0, err(none));
  const props = await call("get_object_properties", { targets: [{ name: "Tri" }] });
  const pr = props.body.data?.items?.[0];
  check("get_object_properties", props.body.ok && pr.parentLayer === "Shapes" && pr.area > 3900 && pr.area < 4100, err(props) || `layer ${pr?.parentLayer}, area ${pr?.area}`);

  const dl = await call("duplicate_layer", { name: "Shapes", newName: "Shapes Copy" });
  check("duplicate_layer copies all objects", dl.body.ok && dl.body.data.copiedItems === dl.body.data.sourceItems && dl.body.data.copiedItems === 5, err(dl) || JSON.stringify(dl.body.data));
  const sub = await call("create_sublayer", { parent: "Shapes", name: "Details" });
  check("create_sublayer", sub.body.ok && sub.body.data.sublayers.includes("Details"), err(sub));

  const ds = await call("get_document_settings", {});
  check("get_document_settings", ds.body.ok && ds.body.data.colorMode === "CMYK" && ds.body.data.rasterEffects, err(ds) || `${ds.body.data?.colorProfile}, raster ${ds.body.data?.rasterEffects?.resolution} ppi`);
  const rr = await call("set_raster_effects_resolution", { resolution: 300 });
  check("set_raster_effects_resolution", rr.body.ok && rr.body.data.resolution === 300, err(rr));

  /* production checks on deliberately bad content */
  await call("draw_line", { ...U, name: "Hairline", x1: 20, y1: 350, x2: 300, y2: 350, stroke: { color: "#000000", width: 0.1 }, layer: "Shapes" });
  await call("add_text", { ...U, name: "Tiny", content: "fine print", x: 350, y: 340, fontSize: 4, layer: "Shapes" });
  await call("draw_pen_path", { ...U, name: "Stray", points: [{ x: 500, y: 300 }, { x: 500, y: 300 }], layer: "Shapes" });
  await call("draw_rectangle", { ...U, name: "Ghost", x: 400, y: 250, width: 30, height: 30, fill: "none", stroke: "none", layer: "Shapes" });
  const pf = await call("preflight_document", { forPrint: true });
  const codes = new Set((pf.body.data?.issues ?? []).map((i) => i.code));
  check("preflight finds hairline, small text, stray point, unpainted path", pf.body.ok && ["HAIRLINE", "SMALL_TEXT", "STRAY_POINT", "UNPAINTED_PATH"].every((c) => codes.has(c)), err(pf) || [...codes].join(", "));

  const dry = await call("cleanup_document", {});
  const kinds = (dry.body.data?.candidates ?? []).map((c) => c.kind);
  check("cleanup dry run lists stray point and unpainted path", dry.body.ok && dry.body.data.removedCount === 0 && kinds.includes("stray_point") && kinds.includes("unpainted_path"), err(dry) || kinds.join(", "));
  const refused = await call("cleanup_document", { dryRun: false });
  check("cleanup refuses without confirm", refused.body.error?.code === "CONFIRMATION_REQUIRED", err(refused));
  const clean = await call("cleanup_document", { dryRun: false, confirm: true, remove: ["stray_points", "unpainted_paths"] });
  const gone = await call("get_object_properties", { targets: [{ name: "Ghost" }] });
  check("cleanup removes them", clean.body.ok && clean.body.data.removedCount >= 2 && gone.body.error?.code === "OBJECT_NOT_FOUND", err(clean) || `${clean.body.data?.removedCount} removed`);

  const batch = await call("batch_operation", { steps: [
    { tool: "create_layer", args: { name: "Batch" } },
    { tool: "draw_rectangle", args: { ...U, name: "B1", x: 150, y: 200, width: 40, height: 40, fill: "#06B6D4", layer: "Batch" } },
    { tool: "draw_rectangle", args: { ...U, name: "B2", x: 200, y: 200, width: 40, height: 40, fill: "#06B6D4", layer: "Batch" } },
    { tool: "align_objects", args: { targets: [{ name: "B1" }, { name: "B2" }], alignment: "top" } },
  ] });
  check("batch_operation runs all steps in Illustrator", batch.body.ok && batch.body.data.completed === 4 && batch.body.source === "illustrator", err(batch) || JSON.stringify(batch.body.data?.results?.find((r) => !r.ok)?.error ?? ""));

  /* exports */
  const tif = await call("export_tiff", { path: TIF, ppi: 150, colorSpace: "CMYK" });
  check("export_tiff", tif.body.ok && fileOk(TIF), err(tif) || `${statSync(TIF).size} bytes`);
  const sel = await call("export_selection", { targets: [{ name: "Tri" }], path: SELPNG, padding: 10 });
  check("export_selection png", sel.body.ok && fileOk(SELPNG), err(sel) || `${statSync(SELPNG).size} bytes, ${JSON.stringify(sel.body.data?.size)}`);
  const sels = await call("export_selection", { targets: [{ name: "Spiral" }, { name: "Pie" }], path: SELSVG, format: "svg" });
  check("export_selection svg", sels.body.ok && fileOk(SELSVG), err(sels));
  const still = await call("inspect_document", { limit: 1 });
  check("original document is still the target after export_selection", still.body.ok && still.body.data.name === "P4 Test", still.body.data?.name);

  const save = await call("save_file", { path: AI });
  check("save .ai before print PDF", save.body.ok && fileOk(AI), err(save));
  const pdf = await call("export_print_pdf", { path: PDF, bleed: 3, registrationMarks: true });
  check("export_print_pdf (PDF/X-4, 3 mm bleed, marks)", pdf.body.ok && fileOk(PDF), err(pdf) || `${statSync(PDF).size} bytes, reopened ${!!pdf.body.data?.files?.[0]?.reopened}`);

  const rep = await call("generate_design_report", { forPrint: true });
  check("generate_design_report", rep.body.ok && rep.body.data.markdown.includes("# Design report: p4.ai") && rep.body.data.preflight, err(rep) || rep.body.data?.markdown?.split("\n")[0]);

  const cl = await call("close_document", { save: false, confirm: true });
  check("close test document", cl.body.ok, err(cl));
} finally {
  await client.close();
}
const failed = results.filter((r) => !r).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
