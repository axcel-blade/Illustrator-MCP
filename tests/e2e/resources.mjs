/**
 * Live check of MCP resources and prompts against the REAL Illustrator.
 * Opens a small document, reads every illustrator:// resource, renders every prompt, then closes the document.
 * Run after `pnpm build`:  node tests/e2e/resources.mjs
 */
import { connect } from "./lib.mjs";

const { client, call } = await connect();
const results = [];
const check = (name, ok, detail = "") => { results.push(ok); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  - " + detail : ""}`); };
const read = async (p) => JSON.parse((await client.readResource({ uri: `illustrator://${p}` })).contents[0].text);

try {
  const doc = await call("create_document", { name: "MCP Resource Test", width: 400, height: 300, units: "px", colorMode: "RGB" });
  check("create test document", doc.body.ok && doc.body.source === "illustrator");
  await call("draw_rectangle", { units: "px", name: "Probe Rect", x: 20, y: 20, width: 100, height: 60, fill: "#4F46E5", layer: "Shapes" });
  await call("add_text", { units: "px", name: "Probe Text", content: "Hello", x: 20, y: 120, fontSize: 24 });
  await call("select_objects", { targets: [{ name: "Probe Rect" }] });

  const expectations = {
    status: (b) => b.ok && b.application?.version ? `Illustrator ${b.application.version}, ${b.application.documentCount} doc(s)` : false,
    documents: (b) => b.ok && b.data.documents.some((d) => d.name === "MCP Resource Test") ? `${b.data.count} open` : false,
    "active-document": (b) => b.ok && b.data.name === "MCP Resource Test" && b.data.items.some((i) => i.name === "Probe Rect") ? `${b.data.items.length} items` : false,
    selection: (b) => b.ok && JSON.stringify(b.data).includes("Probe Rect") ? "Probe Rect selected" : false,
    artboards: (b) => b.ok && b.data.artboards[0].width === 400 ? "400x300" : false,
    layers: (b) => b.ok && b.data.layers.some((l) => l.name === "Shapes") ? b.data.layers.map((l) => l.name).join(", ") : false,
    colors: (b) => b.ok && b.data.swatchCount > 0 ? `${b.data.swatchCount} swatches` : false,
    fonts: (b) => b.ok && b.data.installedCount > 0 && b.data.documentFonts.length > 0 ? `${b.data.installedCount} installed, used: ${b.data.documentFonts.join(", ")}` : false,
    brushes: (b) => b.ok && Array.isArray(b.data.brushes) ? `${b.data.brushes.length} brushes, ${b.data.graphicStyles.length} graphic styles` : false,
    "linked-assets": (b) => b.ok && Array.isArray(b.data.missingLinks) ? `${b.data.linked.length} linked, ${b.data.embedded.length} embedded` : false,
    capabilities: (b) => b.ok && b.adapter === "com" && b.tools.length > 150 ? `${b.tools.length} tools, ${b.backgroundTools.length} background` : false,
  };
  for (const [p, test] of Object.entries(expectations)) {
    const b = await read(p);
    const d = test(b);
    check(`illustrator://${p}`, !!d, d || JSON.stringify(b.error ?? b).slice(0, 200));
  }

  const { prompts } = await client.listPrompts();
  let rendered = 0;
  for (const p of prompts) {
    const args = Object.fromEntries((p.arguments ?? []).filter((a) => a.required).map((a) => [a.name, "Test"]));
    const r = await client.getPrompt({ name: p.name, arguments: args });
    if (r.messages[0]?.content?.text?.length > 100) rendered++;
  }
  check("every prompt renders", rendered === prompts.length, `${rendered}/${prompts.length}`);

  const cl = await call("close_document", { save: false, confirm: true });
  check("close test document", cl.body.ok);
} finally {
  await client.close();
}
const failed = results.filter((r) => !r).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
