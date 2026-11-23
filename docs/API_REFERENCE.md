# API reference

How an MCP client talks to this server: transports, result and error formats, background jobs, resources and
prompts. The full list of tools with their parameters is generated into [TOOLS.md](TOOLS.md)
(`node scripts/gen-docs.mjs` after `pnpm build`).

## Transports

| Transport | Start | Use |
|---|---|---|
| stdio (default) | `node dist/index.js` | Local clients: Claude Desktop, Claude Code, Cursor, VS Code, ... ([CLIENTS.md](CLIENTS.md)) |
| Streamable HTTP | `node dist/index.js --transport http` | Remote clients at `/mcp` (or `/mcp/<MCP_SECRET_PATH>`); see [INSTALLATION.md](INSTALLATION.md#5-chatgpt-remote-mcp-over-https) |

Server capabilities: `tools`, `resources`, `prompts`, `logging`. All tool inputs are strict Zod schemas published
as JSON Schema in `tools/list`.

## Conventions

- **Coordinates**: points, origin at the artboard's top-left, x right, **y down** ([COORDINATES.md](COORDINATES.md)).
  Most drawing tools accept `units` (`pt px mm cm in pc`) for one call; `set_document_units` changes the session default.
- **Target document**: the server pins the document it last worked on. Use `list_documents` / `activate_document` to switch.
- **Object references**: `"selection"`, `{ name, layer? }` or `{ uuid }`.
- **Files**: every path must be inside `ALLOWED_PATHS`; relative paths resolve inside the first root. Existing files
  are not overwritten unless `overwrite: true`.
- **Destructive tools** (annotation `destructiveHint: true`) refuse to run without `confirm: true`. Clients should ask the user first.

## Tool results

Every successful call returns one text block with this JSON, plus image blocks when a preview was produced:

```json
{
  "ok": true,
  "tool": "draw_rectangle",
  "source": "illustrator",
  "data": { "name": "Box", "type": "PathItem", "bounds": { "x": 20, "y": 20, "width": 100, "height": 60 } },
  "warnings": []
}
```

`source` says who verified the data:

| `source` | Meaning |
|---|---|
| `illustrator` | Read back from Illustrator after the operation |
| `server` | Computed by the server only (plans, validation, job status) |
| `mock` | Test adapter; nothing happened in Illustrator (a warning says so) |

A call is only reported as successful when the script inside Illustrator returned success. Design tools also return
`verification` (`expectedObjects`, `foundObjects`, `missing`) from inspecting the document after building.

## Errors

Failures set `isError: true` and return:

```json
{ "ok": false, "tool": "save_file", "error": { "code": "FILE_EXISTS", "message": "File already exists: ...", "details": null } }
```

| Code | Meaning | Typical fix |
|---|---|---|
| `VALIDATION_ERROR` | Bad arguments or impossible request | Fix the arguments |
| `PLAN_INVALID` | Design plan failed schema or semantic checks | See `details` |
| `PATH_NOT_ALLOWED` | Path outside `ALLOWED_PATHS` (or UNC) | Use an allowed folder or extend `ALLOWED_PATHS` |
| `FILE_EXISTS` / `FILE_NOT_FOUND` | Overwrite protection / missing input | `overwrite: true` after asking / correct path |
| `CONFIRMATION_REQUIRED` | Destructive or lossy action | Ask the user, then pass `confirm: true` |
| `NO_ACTIVE_DOCUMENT` / `OBJECT_NOT_FOUND` | Nothing to act on | Create/open a document, check names |
| `ILLUSTRATOR_NOT_INSTALLED` / `ILLUSTRATOR_NOT_RUNNING` | Application unavailable | Install / start Illustrator (or enable auto-launch) |
| `BRIDGE_TIMEOUT` | Illustrator did not answer in time | Close modal dialogs; use `background: true` for long work |
| `BRIDGE_UNAVAILABLE` | Queue full or bridge cannot start | Retry later; check diagnostics |
| `ILLUSTRATOR_SCRIPT_ERROR` | Illustrator raised an error | Message and `line` are in `details` |
| `UNSUPPORTED_OPERATION` | Not possible through scripting | See [SUPPORTED_FEATURES.md](SUPPORTED_FEATURES.md) |
| `INTERNAL_ERROR` | Unexpected server error | Check `logs/` |

## Background jobs

Long-running tools (whole designs, batch exports, print PDFs, preflight, batch operations; listed in
`illustrator://capabilities` as `backgroundTools`) accept `background: true`:

1. The call returns at once: `{ "data": { "jobId": "7ba783f5", "state": "queued", ... }, "source": "server" }`.
2. `wait_for_job { jobId, timeoutSeconds ≤ 55 }` waits and returns the job; call again while it is `running`.
3. When `state` is `succeeded`, `data.result` holds the tool's normal result (images included); `failed` jobs carry `job.error`.

| Tool | Purpose |
|---|---|
| `get_job` | Current state, and the result once finished |
| `wait_for_job` | Block up to 55 s for completion |
| `list_jobs` | Recent jobs, newest first (last 50 finished are kept, in memory only) |
| `cancel_job` | Cancel a queued job; a running job cannot be interrupted inside Illustrator and the result says so |

Jobs run one at a time in submission order. Each Illustrator call inside a job may take up to
`ILLUSTRATOR_JOB_TIMEOUT_MS` (default 15 min). Ordinary calls made while a job runs wait behind it.

## Batch operations

`batch_operation { steps: [{ tool, args, label? }], continueOnError? }` runs tool calls in order inside one request.
Each step is validated exactly like a direct call and keeps its own `confirm` rules. It stops at the first failure
unless `continueOnError`, and returns `{ completed, failed, total, results[] }`. Job tools and nested batches are rejected.

## Resources

Live resources read Illustrator when requested and return `{ "ok": true, "source", "data", "warnings" }`, or
`{ "ok": false, "error": { code, message } }` when nothing can be read (for example no open document).

| URI | Content |
|---|---|
| `illustrator://status` | Installation, bridge, running application, open documents, queue and job counts |
| `illustrator://documents` | Open documents with path, saved state, color mode, active flag |
| `illustrator://active-document` | Target document: artboards, layers, top-level objects (first 200) |
| `illustrator://selection` | Selected objects with properties |
| `illustrator://artboards` | Artboards with sizes |
| `illustrator://layers` | Layers top-to-bottom with state and item counts |
| `illustrator://colors` | Swatch groups, swatches, spot colors |
| `illustrator://fonts` | Installed fonts (first 2000) and fonts used by the document |
| `illustrator://brushes` | Brushes, graphic styles, symbols, character and paragraph styles |
| `illustrator://linked-assets` | Linked and embedded images; missing links flagged |
| `illustrator://capabilities` | Tools, background tools, file formats, limits, allowed folders, unsupported features (server data) |
| `illustrator://schema/design-plan` | JSON Schema of design plans ([DESIGN_SCHEMA.md](DESIGN_SCHEMA.md)) |
| `illustrator://templates` | Design templates and default sizes |
| `illustrator://styles` | Style palettes and type systems |
| `illustrator://docs/coordinates` | Coordinate convention (Markdown) |
| `illustrator://plans/{planId}` | Stored design plans (listable) |

## Prompts

Each template returns one user message that walks the agent through planning, building, validating and exporting,
and ends with the same rules: check `source` and `verification`, use background jobs for large work, judge visuals
only from returned previews, save with `save_file`, ask before overwriting, report written files.

| Prompt | Required arguments | Optional |
|---|---|---|
| `design_from_brief` | `brief` | `iterations` |
| `critique_active_document` | | `goals` |
| `brand_identity_kit` | `brand`, `description` | `style` |
| `create_professional_logo` | `brand`, `description` | `style`, `colors` |
| `corporate_brand_identity` | `company`, `description` | `style` |
| `brand_guidelines_document` | `brand` | `palette`, `fonts` |
| `business_card` | `name`, `role`, `company` | `contact`, `style` |
| `professional_poster` | `topic` | `details`, `size`, `style` |
| `vector_illustration` | `subject` | `style`, `size` |
| `character_illustration` | `character` | `style`, `poses` |
| `product_packaging` | `product`, `format` | `style` |
| `seamless_pattern` | `motif` | `colors`, `tileSize` |
| `infographic` | `topic`, `data` | `format` |
| `icon_library` | `icons` | `style`, `size` |
| `fashion_technical_drawing` | `garment` | `views` |
| `prepare_for_print` | | `printer` |
| `audit_document` | | `goals` |

## Configuration

Environment variables are documented in [CONFIGURATION.md](CONFIGURATION.md). The ones that change API behaviour:
`ALLOWED_PATHS`, `ILLUSTRATOR_TIMEOUT_MS`, `ILLUSTRATOR_JOB_TIMEOUT_MS`, `ILLUSTRATOR_AUTO_LAUNCH`, `MCP_AUTH_TOKEN`, `MCP_SECRET_PATH`.
