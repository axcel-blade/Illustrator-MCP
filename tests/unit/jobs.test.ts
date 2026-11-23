import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadConfig } from "../../src/config/index.js";
import { MockAdapter } from "../../src/illustrator/bridge/mock-adapter.js";
import { JobManager } from "../../src/jobs/job-manager.js";
import { createContext, createServer } from "../../src/server.js";

const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));

describe("JobManager", () => {
  it("runs jobs in order and records results and failures", async () => {
    const jobs = new JobManager<number>();
    const order: string[] = [];
    const a = jobs.start("a", async () => { await tick(20); order.push("a"); return 1; });
    const b = jobs.start("b", async () => { order.push("b"); throw new Error("boom"); });
    expect(a.state).toBe("queued");
    expect((await jobs.wait(a.id, 1000)).result).toBe(1);
    const fb = await jobs.wait(b.id, 1000);
    expect(order).toEqual(["a", "b"]);
    expect(fb.state).toBe("failed");
    expect(fb.error?.message).toBe("boom");
    expect(fb.elapsedMs).toBeGreaterThanOrEqual(0);
  });

  it("wait returns the running snapshot when the timeout passes first", async () => {
    const jobs = new JobManager<string>();
    const j = jobs.start("slow", async () => { await tick(200); return "done"; });
    const early = await jobs.wait(j.id, 20);
    expect(early.state).toBe("running");
    expect(early.result).toBeUndefined();
    expect((await jobs.wait(j.id, 1000)).state).toBe("succeeded");
  });

  it("cancels queued jobs but refuses to pretend a running job stopped", async () => {
    const jobs = new JobManager<number>();
    const running = jobs.start("r", async () => { await tick(50); return 1; });
    const queued = jobs.start("q", async () => 2);
    await tick(5);
    expect(jobs.cancel(running.id)).toMatchObject({ cancelled: false, state: "running" });
    expect(jobs.cancel(queued.id)).toEqual({ cancelled: true, state: "cancelled" });
    await jobs.wait(running.id, 1000);
    await tick(5);
    expect(jobs.get(queued.id).state).toBe("cancelled");
    expect(jobs.get(queued.id).result).toBeUndefined();
  });

  it("keeps only the newest finished jobs and reports unknown ids", async () => {
    const jobs = new JobManager<number>(2);
    const ids: string[] = [];
    for (let i = 0; i < 4; i++) ids.push(jobs.start("t", async () => i).id);
    await jobs.wait(ids[3]!, 1000);
    jobs.start("t", async () => 9);
    expect(jobs.list().length).toBeLessThanOrEqual(3);
    expect(() => jobs.get("nope")).toThrow(/No job/);
  });
});

describe("background tool calls over MCP", () => {
  let client: Client;
  let mock: MockAdapter;
  type R = { isError?: boolean; content: { type: string; text?: string }[] };
  const call = async (name: string, args: Record<string, unknown> = {}) => {
    const r = (await client.callTool({ name, arguments: args })) as R;
    return { isError: Boolean(r.isError), body: JSON.parse(r.content[0]!.text!) as Record<string, any> };
  };
  const plan = {
    version: 1,
    document: { name: "Job Test", width: 100, height: 100, units: "px", colorMode: "RGB" },
    background: { type: "solid", color: "#FFFFFF" },
    palette: { name: "p", colors: { a: "#4F46E5" } },
    typography: { heading: { fonts: ["Arial"] }, body: { fonts: ["Arial"] } },
    layers: [{ name: "G" }],
    elements: [{ type: "rect", name: "R", layer: "G", x: 10, y: 10, width: 20, height: 20, fill: "palette.a" }],
  };

  beforeAll(async () => {
    const config = loadConfig({ ILLUSTRATOR_ADAPTER: "mock", ALLOWED_PATHS: mkdtempSync(join(tmpdir(), "mcp-jobs-")), LOG_LEVEL: "error" }, []);
    mock = new MockAdapter();
    const server = createServer(createContext(config, mock));
    const [a, b] = InMemoryTransport.createLinkedPair();
    client = new Client({ name: "test", version: "1.0.0" });
    await Promise.all([server.connect(a), client.connect(b)]);
  });
  afterAll(async () => client.close());

  it("exposes background only on long-running tools, plus the job tools", async () => {
    const { tools } = await client.listTools();
    const byName = new Map(tools.map((t) => [t.name, t]));
    for (const n of ["get_job", "wait_for_job", "list_jobs", "cancel_job"]) expect(byName.has(n), n).toBe(true);
    expect(Object.keys(byName.get("execute_design_plan")!.inputSchema.properties ?? {})).toContain("background");
    expect(Object.keys(byName.get("draw_rectangle")!.inputSchema.properties ?? {})).not.toContain("background");
  });

  it("returns a jobId at once and delivers the real result later", async () => {
    mock.delayMs = 150;
    const started = Date.now();
    const r = await call("execute_design_plan", { plan, preview: false, background: true });
    expect(Date.now() - started).toBeLessThan(140);
    expect(r.body.source).toBe("server");
    const jobId = r.body.data.jobId as string;
    expect(jobId).toBeTruthy();

    const early = await call("get_job", { jobId });
    expect(["queued", "running"]).toContain(early.body.data.job.state);

    const done = await call("wait_for_job", { jobId, timeoutSeconds: 10 });
    expect(done.body.data.job.state).toBe("succeeded");
    expect(done.body.data.result.verification).toBeDefined();
    expect(done.body.source).toBe("mock");
    expect((await call("list_jobs")).body.data.jobs.map((j: { id: string }) => j.id)).toContain(jobId);
    mock.delayMs = 0;
  });

  it("reports job failures with the original error code", async () => {
    const r = await call("execute_design_plan", { planId: "does-not-exist", background: true });
    const done = await call("wait_for_job", { jobId: r.body.data.jobId, timeoutSeconds: 5 });
    expect(done.body.data.job.state).toBe("failed");
    expect(done.body.data.job.error.code).toBeTruthy();
  });

  it("validates job ids", async () => {
    const r = await call("get_job", { jobId: "missing" });
    expect(r.isError).toBe(true);
    expect(r.body.error.code).toBe("OBJECT_NOT_FOUND");
  });
});
