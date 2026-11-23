# Spec gap analysis (Illustrator 2027 / v31.0, Windows COM bridge)

Measured against the "Adobe Illustrator MCP Server" project spec, on branch `feature/save-open-file`.
Baseline: **160 tools**, 5 resources, 3 prompts, 111 passing unit tests, real-Illustrator e2e suites.

## 1. What already meets the spec

| Spec section | Status |
|---|---|
| 2A MCP server (official SDK, zod schemas, errors, logging) | Done |
| 2B Integration (ExtendScript/JSX via COM / AppleScript, version detection) | Done. UXP has no Illustrator scripting API in v31; CEP is not needed |
| 2D Execution engine (plans, verification by inspection, `source` on every result) | Done |
| 3 Documents | Done (+ `save_file`, `open_file` on this branch) |
| 4 Artboards | Mostly done |
| 5 Paths & shapes | Mostly done |
| 6 Object manipulation | Mostly done |
| 7 Pathfinder | Done (one tool, all modes) except shape builder |
| 8 Color & appearance | Mostly done |
| 10 Typography | Mostly done |
| 11 Layers | Mostly done |
| 12 High-level design (logo, brand, poster, packaging, icons, UI, infographic…) | Done for branding/marketing/packaging/digital; illustration and fashion only partly |
| 14 Images | Mostly done |
| 15 Export | PNG/JPG/SVG/PDF/EPS done |
| 20 Safety (path sandbox, confirm on destructive ops, op allowlist) | Done |

## 2. Gaps worth building (all are scriptable in v31)

**P1. Reliability (seen in practice)**
- ~~Long plans hit the 120 s bridge timeout while Illustrator keeps working.~~ **Done:** the 25
  long-running tools accept `background: true` and return a `jobId` immediately. `get_job`,
  `wait_for_job`, `list_jobs` and `cancel_job` collect the result. Each Illustrator call inside a job
  uses `ILLUSTRATOR_JOB_TIMEOUT_MS` (default 15 min). Jobs run one at a time, in order.
- Plans run slower when many documents are open; batch DOM writes and skip redraws.
- Plan elements on a pre-existing document land under its old layers. Fixed for
  `execute_plan` pinning on this branch; layer order still needs a fix.

**P2. Resources (§17): Done.** Added `status`, `documents`, `active-document`, `selection`, `artboards`,
`layers`, `colors`, `fonts`, `brushes`, `linked-assets`, `capabilities`. (live, structured JSON; errors returned as `{ ok: false, error }`).

**P3. Prompts (§18): Done.** 14 spec templates added, each covering plan, build, validate and export (logo, business card, poster, illustration, character,
packaging, seamless pattern, infographic, icon library, fashion tech drawing, print prep, audit).

**P4. Tools: mostly done.** 17 tools added and verified live (`tests/e2e/production.mjs`, 26/26):
`draw_triangle`, `draw_arc`, `draw_spiral`, `shear_objects`, `select_all` (incl. deselect),
`get_object_properties`, `duplicate_layer`, `create_sublayer`, `get_document_settings`,
`set_raster_effects_resolution`, `export_tiff`, `export_selection`, `export_print_pdf`
(PDF/X, bleed, crop/registration marks), `preflight_document`, `cleanup_document`,
`batch_operation`, `generate_design_report`.
Already covered by existing tools: unlock/show (`lock_objects` / `hide_objects` with false),
rounded rectangles (`draw_rectangle` cornerRadius), anchors and path data (`edit_path_points`),
stroke cap/join/dash (`set_stroke`), reflect (`flip_objects`).
Still open:
- Opacity masks and overprint: no DOM API; needs a verified menu-command route.
- Ruler origin: `rulerOrigin` semantics differ between document and artboard; left out until verified.
- Document bleed: fixed at document creation, not scriptable; bleed is applied at PDF export instead.
- `execute_script`: only behind an explicit config flag plus a confirmation step (spec §20).

**P5. Docs (§23): Done.** Added [API_REFERENCE.md](API_REFERENCE.md), [SUPPORTED_FEATURES.md](SUPPORTED_FEATURES.md)
and [CLIENTS.md](CLIENTS.md) (Claude Desktop, Claude Code, Cursor, VS Code, Windsurf, Gemini CLI, Codex; ForgePilot
covered by the generic stdio/HTTP instructions, untested). The spec's `MCP_TOOLS.md` is the generated [TOOLS.md](TOOLS.md).

## 3. Not available through the v31 scripting API (document honestly, don't fake)

Freeform gradients, creating gradient meshes, Puppet Warp, Intertwine, Shape Builder,
Perspective Grid drawing, Live Paint editing. Possible partial routes, each to be verified:
`app.executeMenuCommand` for Repeat (radial/grid/mirror), Live Paint make/expand, 3D classic
effects and envelope warps via `applyEffect` LiveEffect XML, Recolor via swatch remapping.

## 4. Spec items intentionally not followed

- **`illustrator_` tool-name prefix**: renaming 160 tools would break existing clients. MCP
  clients already namespace by server. Recommend keeping names (optionally add aliases).
- **WebSocket bridge**: needs a CEP panel running inside Illustrator. COM `DoJavaScriptFile`
  is the supported, extension-free route on Windows. Async jobs (P1) give non-blocking
  behaviour without installing a panel.
