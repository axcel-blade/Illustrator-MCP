/**
 * Live check of the File-menu tools against the REAL Illustrator: save_copy, revert_document,
 * save_all_documents, close_all_documents, list_recent_files, open_recent_file, new_from_template.
 * Documents that were already open are passed in `except`, so only this test's documents are closed.
 * Run after `pnpm build`:  node tests/e2e/file-menu.mjs
 */
import { existsSync, mkdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import { connect, OUT } from "./lib.mjs";

mkdirSync(OUT, { recursive: true });
const { client, call } = await connect();
const results = [];
const check = (name, ok, detail = "") => { results.push(!!ok); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  - " + detail : ""}`); };
const err = (r) => (r.body.error ? `${r.body.error.code}: ${r.body.error.message}` : "");
const P = (f) => join(OUT, f);
const files = ["fm-a.ai", "fm-a-copy.pdf", "fm-a-copy.ai", "fm-b.ai", "fm-template.ait"].map(P);
rmSync(P("fm-template.ai"), { force: true });
for (const f of files) rmSync(f, { force: true });
const [A, COPY_PDF, COPY_AI, B, AIT] = files;
const count = async () => (await call("inspect_document", { limit: 1 })).body.data?.pageItemCount;

try {
  const pre = await call("list_documents");
  const keep = (pre.body.data?.documents ?? []).map((d) => d.name);
  check("record documents already open (kept open)", pre.body.ok, keep.length ? keep.join(", ") : "none");

  await call("create_document", { name: "FM A", width: 300, height: 200, units: "px", colorMode: "RGB" });
  await call("draw_rectangle", { units: "px", name: "One", x: 10, y: 10, width: 50, height: 50, fill: "#4F46E5" });
  const unsavedCopy = await call("save_copy", { path: COPY_PDF });
  check("save_copy refuses a never-saved document", unsavedCopy.body.error?.code === "VALIDATION_ERROR", err(unsavedCopy));
  await call("save_file", { path: A });

  const pdf = await call("save_copy", { path: COPY_PDF });
  check("save_copy .pdf writes the copy", pdf.body.ok && existsSync(COPY_PDF) && statSync(COPY_PDF).size > 0, err(pdf) || `${pdf.body.data?.bytes} bytes`);
  check("open document still points at the original .ai", pdf.body.data?.document?.path?.toLowerCase() === A.toLowerCase(), pdf.body.data?.document?.path);
  const ai = await call("save_copy", { path: COPY_AI });
  check("save_copy .ai", ai.body.ok && existsSync(COPY_AI), err(ai));

  await call("draw_rectangle", { units: "px", name: "Two", x: 80, y: 10, width: 50, height: 50, fill: "#06B6D4" });
  const dirtyCopy = await call("save_copy", { path: P("fm-dirty.pdf") });
  check("save_copy refuses unsaved changes", dirtyCopy.body.error?.code === "CONFIRMATION_REQUIRED", err(dirtyCopy));
  const n2 = await count();
  const noConfirm = await call("revert_document", {});
  check("revert needs confirm", noConfirm.body.error?.code === "CONFIRMATION_REQUIRED", err(noConfirm));
  const rev = await call("revert_document", { confirm: true });
  const n1 = await count();
  check("revert_document restores the saved version", rev.body.ok && rev.body.data.discardedChanges === true && n2 === 2 && n1 === 1, err(rev) || `${n2} -> ${n1} objects`);

  await call("create_document", { name: "FM B", width: 300, height: 200, units: "px", colorMode: "RGB" });
  await call("save_file", { path: B });
  await call("draw_rectangle", { units: "px", name: "B1", x: 10, y: 10, width: 20, height: 20 });
  await call("activate_document", { name: "fm-a.ai" });
  await call("draw_rectangle", { units: "px", name: "A2", x: 10, y: 100, width: 20, height: 20 });
  const sa = await call("save_all_documents");
  const savedNames = (sa.body.data?.saved ?? []).map((d) => d.name);
  check("save_all_documents saves both changed documents", sa.body.ok && savedNames.includes("fm-a.ai") && savedNames.includes("fm-b.ai"), err(sa) || savedNames.join(", "));

  const badAit = await call("save_file", { path: AIT });
  check("save_file points .ait to save_copy", badAit.body.error?.code === "VALIDATION_ERROR", err(badAit));
  await call("activate_document", { name: "fm-a.ai" });
  const tplSave = await call("save_copy", { path: AIT });
  check("save_copy .ait writes a template", tplSave.body.ok && existsSync(AIT) && !existsSync(P("fm-template.ai")), err(tplSave));
  const recent = await call("list_recent_files", { limit: 20 });
  const rf = recent.body.data?.files ?? [];
  const pick = rf.find((f) => f.exists && f.path.toLowerCase().startsWith(OUT.toLowerCase()) && /\.ai$/i.test(f.path));
  const idx = pick?.index;
  check("list_recent_files reads Illustrator's recent list", recent.body.ok && rf.length > 0, err(recent) || `${rf.length} files, newest ${rf[0]?.name} (${rf[0]?.lastOpened})`);

  await call("create_document", { name: "FM C", width: 100, height: 100, units: "px", colorMode: "RGB" });
  const refuse = await call("close_all_documents", { mode: "save", except: keep });
  check("close_all (save) refuses never-saved documents", refuse.body.error?.code === "CONFIRMATION_REQUIRED" && /FM C/.test(refuse.body.error.message), err(refuse));
  const closeAll = await call("close_all_documents", { mode: "discard", confirm: true, except: keep });
  const after = await call("list_documents");
  const left = (after.body.data?.documents ?? []).map((d) => d.name);
  check("close_all (discard) closes only this test's documents", closeAll.body.ok && left.length === keep.length && keep.every((k) => left.includes(k)), err(closeAll) || `closed ${closeAll.body.data?.closed?.map((c) => c.name).join(", ")}`);

  if (idx !== undefined) {
    const or = await call("open_recent_file", { index: idx });
    check("open_recent_file opens the chosen recent file", or.body.ok && or.body.data?.path?.toLowerCase() === pick.path.toLowerCase(), err(or) || pick.name);
    await call("close_document", { save: false, confirm: true });
  } else check("open_recent_file opens the chosen recent file", false, "no existing .ai from test-output in the recent list");

  const tpl = await call("new_from_template", { path: AIT });
  const tplDoc = tpl.body.data;
  check("new_from_template creates an untitled document", tpl.body.ok && tplDoc?.path === null && tplDoc?.pageItemCount >= 2, err(tpl) || `${tplDoc?.name}, ${tplDoc?.pageItemCount} items, path ${tplDoc?.path}`);
  await call("close_document", { save: false, confirm: true });
} finally {
  await client.close();
}
const failed = results.filter((r) => !r).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
