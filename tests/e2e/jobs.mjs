/**
 * Live check of background jobs against the REAL Illustrator:
 *  1. a large design plan with background: true returns a jobId at once,
 *  2. wait_for_job collects the verified result (every element found in the NEW document),
 *  3. save_file writes .ai and .pdf, open_file re-opens the .ai (and activates it if already open).
 * Run after `pnpm build`:  node tests/e2e/jobs.mjs
 */
import { existsSync, mkdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import { connect, OUT } from "./lib.mjs";

mkdirSync(OUT, { recursive: true });
const { client, call } = await connect();
const results = [];
const check = (name, ok, detail = "") => { results.push({ name, ok, detail }); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  - " + detail : ""}`); };

/* A plan big enough to have exceeded the old 120 s synchronous limit on this machine. */
const elements = [];
for (let r = 0; r < 8; r++) {
  for (let c = 0; c < 10; c++) {
    const i = r * 10 + c;
    elements.push({ type: "rect", name: `Tile ${i}`, layer: "Graphics", x: 40 + c * 150, y: 120 + r * 105, width: 130, height: 85, cornerRadius: 12,
      fill: { type: "linear", angle: 45, stops: [{ color: "#4F46E5", position: 0 }, { color: "#06B6D4", position: 100 }] } });
    elements.push({ type: "text", name: `Label ${i}`, layer: "Typography", content: `Tile ${i}`, fontRole: "body", fontSize: 14, color: "#FFFFFF", x: 56 + c * 150, y: 150 + r * 105 });
  }
}
elements.push({ type: "text", name: "Title", layer: "Typography", content: "Background job test", fontRole: "heading", fontSize: 40, color: "#0F172A", x: 40, y: 40 });
const plan = {
  version: 1,
  document: { name: "MCP Job Test", width: 1600, height: 1000, units: "px", colorMode: "RGB" },
  background: { type: "solid", color: "#FFFFFF" },
  swatches: false,
  palette: { name: "Ferx", colors: { indigo: "#4F46E5" } },
  typography: { heading: { fonts: ["Montserrat-Bold", "Arial-BoldMT"] }, body: { fonts: ["Montserrat-Regular", "ArialMT"] } },
  layers: [{ name: "Typography" }, { name: "Graphics" }, { name: "Background", locked: true }],
  elements,
};
const expected = elements.length + 1; /* + Background */

try {
  const status = await call("illustrator_status", { probe: true });
  check("Illustrator reachable", status.body.ok && !!status.body.data.application, status.body.data.application?.version ?? status.body.data.probeError);

  const t0 = Date.now();
  const start = await call("execute_design_plan", { plan, preview: true, background: true });
  const returnedMs = Date.now() - t0;
  const jobId = start.body.data?.jobId;
  check("background call returns a jobId immediately", !!jobId && returnedMs < 3000, `${returnedMs} ms, job ${jobId}`);

  const peek = await call("get_job", { jobId });
  check("get_job reports queued/running while Illustrator works", ["queued", "running"].includes(peek.body.data?.job?.state), peek.body.data?.job?.state);

  let job, polls = 0;
  do {
    const w = await call("wait_for_job", { jobId, timeoutSeconds: 50 });
    job = w; polls++;
  } while (["queued", "running"].includes(job.body.data?.job?.state) && polls < 30);
  const j = job.body.data.job;
  check("job succeeded", j.state === "succeeded", `${j.state} after ${Math.round((j.elapsedMs ?? 0) / 1000)} s, ${polls} wait call(s)${j.error ? " - " + j.error.message : ""}`);
  check("result comes from Illustrator, not the server", job.body.source === "illustrator", job.body.source);
  const v = job.body.data.result?.verification ?? {};
  check("every element was built in the new document", v.foundObjects === expected && (v.missing ?? []).length === 0, `${v.foundObjects}/${expected} found, missing ${(v.missing ?? []).length}`);
  check("preview image attached to the job result", job.images > 0, `${job.images} image(s)`);

  const docName = job.body.data.result?.document?.name;
  if (docName) await call("activate_document", { name: docName });
  const ai = join(OUT, "job-test.ai"), pdf = join(OUT, "job-test.pdf");
  for (const f of [ai, pdf]) rmSync(f, { force: true });
  const sp = await call("save_file", { path: pdf });
  check("save_file .pdf", sp.body.ok && existsSync(pdf) && statSync(pdf).size > 0, sp.body.error?.message ?? `${existsSync(pdf) ? statSync(pdf).size : 0} bytes`);
  const sa = await call("save_file", { path: ai });
  check("save_file .ai (re-targets the document)", sa.body.ok && existsSync(ai) && sa.body.data?.path?.toLowerCase() === ai.toLowerCase(), sa.body.error?.message ?? sa.body.data?.path);
  const si = await call("save_file", {});
  check("save_file in place", si.body.ok && si.body.data?.format === "in-place", si.body.error?.message ?? si.body.data?.format);
  const again = await call("open_file", { path: ai });
  check("open_file activates an already-open file", again.body.ok && again.body.data?.alreadyOpen === true, again.body.error?.message ?? `alreadyOpen=${again.body.data?.alreadyOpen}`);
  const cl = await call("close_document", { save: false, confirm: true });
  check("close test document", cl.body.ok, cl.body.error?.message ?? "");
  const reopen = await call("open_file", { path: ai });
  const insp = await call("inspect_document", { limit: 1 });
  check("open_file reopens the saved .ai with its content", reopen.body.ok && reopen.body.data?.alreadyOpen === false && insp.body.data?.pageItemCount >= expected,
    reopen.body.error?.message ?? `${insp.body.data?.pageItemCount} items`);
  await call("close_document", { save: false, confirm: true });

  const list = await call("list_jobs");
  check("list_jobs shows the job", list.body.data?.jobs?.some((x) => x.id === jobId));
} finally {
  await client.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
