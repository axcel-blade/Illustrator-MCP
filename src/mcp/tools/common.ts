import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult, ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { z, type ZodRawShape } from "zod";
import type { AppConfig } from "../../config/index.js";
import { jsxColor } from "../../design-engine/compiler.js";
import type { PlanStore } from "../../design-engine/plan-store.js";
import type { JobManager } from "../../jobs/job-manager.js";
import type { IllustratorBridge } from "../../illustrator/bridge/bridge.js";
import { HexColorSchema } from "../../utils/colors.js";
import { McpDesignError, toMcpError } from "../../utils/errors.js";
import { logger } from "../../utils/logger.js";
import type { PathPolicy } from "../../utils/paths.js";
import { toPoints, UnitSchema, type Unit } from "../../utils/units.js";

export interface ToolContext {
  bridge: IllustratorBridge;
  config: AppConfig;
  paths: PathPolicy;
  plans: PlanStore;
  jobs: JobManager<ToolOutput>;
  session: { units: Unit };
}

export interface ToolOutput {
  data: unknown;
  warnings?: string[];
  images?: { base64: string; mimeType: string }[];
  /** Who verified the data: Illustrator itself, the mock adapter, or server-side computation only. */
  source?: "illustrator" | "mock" | "server";
}

export const registeredTools = new Set<string>();

/** Validated in-process entry points to every tool, used by batch_operation. */
export const toolHandlers = new Map<string, { annotations?: ToolAnnotations; run: (args: unknown, ctx: ToolContext) => Promise<ToolOutput> }>();

/**
 * Tools that can run for minutes (whole plans, batch exports). They accept `background: true`,
 * which queues the call as a job and returns its id at once; poll with get_job / wait_for_job.
 */
export const LONG_RUNNING_TOOLS = new Set([
  "execute_design_plan", "generate_design", "revise_design", "improve_design", "generate_design_variations",
  "create_logo", "create_poster", "create_flyer", "create_social_media_graphic", "create_business_card",
  "create_brand_identity", "create_packaging_design", "create_infographic", "create_icon_set",
  "create_vector_illustration", "create_editorial_layout",
  "create_app_screen", "create_landing_page", "create_web_dashboard", "create_ui_kit", "create_ui_design",
  "apply_design_system", "export_multiple_formats", "export_artboards", "data_merge_export",
  "batch_operation", "export_print_pdf", "export_tiff", "preflight_document", "generate_design_report",
]);

const backgroundArg = z.boolean().default(false).describe(
  "Run as a background job: returns a jobId immediately instead of waiting. Use for large designs or batch exports, then poll get_job / wait_for_job.",
);

/** Tool-call payload shared by direct results and finished background jobs. */
export function toCallResult(tool: string, out: ToolOutput, ctx: ToolContext): CallToolResult {
  const source = out.source ?? (ctx.bridge.adapterName === "mock" ? "mock" : "illustrator");
  const warnings = [...(out.warnings ?? [])];
  if (source === "mock") warnings.unshift("MOCK ADAPTER: no real Illustrator was used; results are simulated for testing.");
  const payload = { ok: true, tool, source, data: out.data, warnings };
  return {
    content: [
      { type: "text", text: JSON.stringify(payload, null, 2) },
      ...(out.images ?? []).map((i) => ({ type: "image" as const, data: i.base64, mimeType: i.mimeType })),
    ],
  };
}

export function defineTool<S extends ZodRawShape>(
  server: McpServer,
  ctx: ToolContext,
  def: {
    name: string;
    title?: string;
    description: string;
    input: S;
    annotations?: ToolAnnotations;
    handler: (args: z.objectOutputType<S, z.ZodTypeAny>, ctx: ToolContext) => Promise<ToolOutput>;
  },
): void {
  registeredTools.add(def.name);
  const parser = z.object(def.input);
  toolHandlers.set(def.name, {
    annotations: def.annotations,
    run: (raw, c) => {
      const parsed = parser.safeParse(raw ?? {});
      if (!parsed.success) {
        throw new McpDesignError("VALIDATION_ERROR", `Invalid arguments for ${def.name}: ${parsed.error.issues.map((i) => `${i.path.join(".") || "(root)"} ${i.message}`).join("; ")}`);
      }
      return def.handler(parsed.data as z.objectOutputType<S, z.ZodTypeAny>, c);
    },
  });
  const longRunning = LONG_RUNNING_TOOLS.has(def.name);
  const inputSchema = longRunning ? { ...def.input, background: backgroundArg } : def.input;
  const description = longRunning ? `${def.description} Supports background: true for long runs (returns a jobId; poll get_job).` : def.description;
  server.registerTool(
    def.name,
    { title: def.title, description, inputSchema, annotations: def.annotations },
    (async (rawArgs: z.objectOutputType<S, z.ZodTypeAny> & { background?: boolean }): Promise<CallToolResult> => {
      const started = Date.now();
      try {
        const { background, ...args } = rawArgs;
        if (longRunning && background) {
          const job = ctx.jobs.start(def.name, () =>
            ctx.bridge.withTimeoutScope(ctx.config.illustrator.jobTimeoutMs, () => def.handler(args as z.objectOutputType<S, z.ZodTypeAny>, ctx)),
          );
          return toCallResult(def.name, {
            data: { jobId: job.id, state: job.state, queuedJobs: ctx.jobs.active, next: `Call wait_for_job { jobId: "${job.id}" } or get_job to collect the result.` },
            source: "server",
          }, ctx);
        }
        const out = await def.handler(args as z.objectOutputType<S, z.ZodTypeAny>, ctx);
        logger.debug("tool ok", { tool: def.name, ms: Date.now() - started });
        return toCallResult(def.name, out, ctx);
      } catch (err) {
        const e = toMcpError(err);
        logger.warn("tool error", { tool: def.name, code: e.code, message: e.message });
        return { isError: true, content: [{ type: "text", text: JSON.stringify({ ok: false, tool: def.name, error: e.toJSON() }, null, 2) }] };
      }
    }) as never,
  );
}

/** Run a bridge op and wrap its result as tool output. */
export async function op(ctx: ToolContext, name: string, args: object, extraWarnings: string[] = []): Promise<ToolOutput> {
  const r = await ctx.bridge.run(name, args);
  return { data: r.data, warnings: [...extraWarnings, ...r.warnings] };
}

/* ---------------- shared schemas ---------------- */

export const unitsArg = UnitSchema.optional().describe("Units for coordinates/sizes in this call (default: session units, initially pt)");
export const artboardArg = z.number().int().min(0).optional().describe("Artboard index used as the coordinate origin (default: active)");
export const layerArg = z.string().min(1).max(120).optional().describe("Target layer name (created if missing)");
export const nameArg = z.string().min(1).max(120).optional().describe("Object name, used later to target it");

export const TargetSchema = z.union([
  z.literal("selection"),
  z.object({
    name: z.string().optional(),
    uuid: z.string().optional(),
    layer: z.string().optional(),
  }).refine((r) => r.name !== undefined || r.uuid !== undefined, "Provide name or uuid"),
]);
export const targetArg = TargetSchema.describe('Object reference: "selection" or {name, layer?} / {uuid}');
export const targetsArg = z.array(TargetSchema).min(1).max(500).optional().describe("Multiple object references; defaults to current selection");

export const colorArg = HexColorSchema.describe("Hex color, e.g. #1A2B3C");
export const strokeArg = z.union([
  z.literal("none"),
  z.object({
    color: HexColorSchema,
    width: z.number().min(0).max(1000).default(1),
    dashes: z.array(z.number().min(0)).max(8).optional(),
    cap: z.enum(["butt", "round", "square"]).optional(),
    join: z.enum(["miter", "round", "bevel"]).optional(),
  }),
]);
export const fillArg = z.union([colorArg, z.literal("none")]);

export function color(hex: string | undefined): ReturnType<typeof jsxColor> | undefined {
  return hex ? jsxColor(hex) : undefined;
}

export function fill(v: string | undefined): unknown {
  if (v === undefined) return undefined;
  return v === "none" ? "none" : jsxColor(v);
}

export function stroke(v: z.infer<typeof strokeArg> | undefined): unknown {
  if (v === undefined) return undefined;
  if (v === "none") return "none";
  return { ...v, color: jsxColor(v.color) };
}

/** Convert a value from the call's units to points. */
export function P(ctx: ToolContext, units: Unit | undefined): (v: number | undefined) => number | undefined {
  const u = units ?? ctx.session.units;
  return (v) => (v === undefined ? undefined : toPoints(v, u));
}

export function requireConfirm(confirm: boolean | undefined, what: string): void {
  if (confirm !== true) {
    throw new McpDesignError("CONFIRMATION_REQUIRED", `${what} is destructive. Ask the user, then call again with confirm: true.`);
  }
}

export const READ_ONLY: ToolAnnotations = { readOnlyHint: true, openWorldHint: false };
export const WRITE: ToolAnnotations = { readOnlyHint: false, destructiveHint: false, openWorldHint: false };
export const DESTRUCTIVE: ToolAnnotations = { readOnlyHint: false, destructiveHint: true, openWorldHint: false };
