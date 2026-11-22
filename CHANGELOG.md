# Changelog

## Unreleased

### Added
- 29 tools in `src/mcp/tools/extended.ts` / `illustrator-scripts/extended.jsx`, verified live against Illustrator (`pnpm test:e2e:extended`):
  - Path & object: `offset_path`, `outline_stroke`, `expand_objects`, `create_blend`, `release_blend`, `release_clipping_mask`, `release_compound_path`.
  - Styles & swatches: `create_text_style`, `apply_text_style`, `list_styles`, `apply_graphic_style`, `apply_brush`, `create_spot_color`, `create_swatch_group`, `list_swatches`, `place_symbol`.
  - Text layout: `create_area_text`, `thread_text_frames`, `set_text_columns`, `set_text_attributes` (tracking, kerning, baseline, scale, caps, OpenType, indents, tab stops), `find_replace_text`.
  - Automation: `run_action` and `print_document` (both require `confirm: true`), `fit_artboard_to_artwork`, `export_artboards`, `data_merge_export`, `bind_variable`, `list_variables`, `capture_dataset`, `apply_dataset`.
- Core e2e suite now exercises `edit_path_points` instead of marking anchor editing NOT TESTED.

- One-line installers for Windows (`irm …/install.ps1 | iex`) and macOS (`curl …/install.sh | bash`) in `installers/`: download the latest release (checksum-verified), keep `.env`/`output`/`logs` on upgrade, register with every MCP client found (Claude Desktop incl. the Microsoft Store build, Claude Code, Cursor, Windsurf, VS Code/Insiders, Cline, Roo Code, Gemini CLI, Codex), merging existing configs with a `.illustrator-mcp.bak` backup and writing JSON without a BOM, and build from source for releases without a prebuilt package.
- Release automation: `release.yml` (manual: bump version, date changelog, verify, tag, GitHub Release) and `cd.yml` (on tags: build, test-install and attach `illustrator-mcp-X.Y.Z.zip` + `.sha256`).
- Docs site (`site/`, Astro) rendering `docs/*.md`, published to GitHub Pages by `pages.yml`; also serves the installers.
- `installer.yml` CI: installs the package on clean Windows and macOS runners and checks upgrades and Claude config merging.
- `docs/CONFIGURATION.md`, `tests/security/` (sandbox, script injection, allowlist, confirmation gates, auth), `.gitattributes`, Documentation issue template and Show-and-tell discussion template.
- `node dist/index.js --version`.
- Docker for the docs site: `site/Dockerfile` (nginx, healthcheck, installers as plain text, 404 page), `site/Dockerfile.dev` + `docker-compose.dev.yml` (hot reload, including `docs/`), `docker-compose.yml` (`SITE_PORT`), root `.dockerignore`, and the `docker.yml` workflow that builds and checks both images.

### Fixed
- The `.env` file (created by the installers from `.env.example`) was never read; it is now loaded at startup, without overriding the MCP client's `env` settings.
- The server reported version 0.1.0 to clients; it now reports the `package.json` version.
- `inspect_document` / object info no longer fails on empty text frames.
- SVG export of a single artboard finds Illustrator's renamed output file (`-01` suffix).

### Notes
- `outline_stroke` is built on Offset Path because the Outline Stroke menu command can block Illustrator's scripting engine.
- Warp effects and printer enumeration are not exposed: `Adobe Deform` has no effect when applied by script, and `app.printerList` can hang Illustrator.

## 1.0.0 — 2026-11-11

First stable major release. Same feature set as 0.2.0: cross-platform Windows/macOS Illustrator bridge, advanced vector/typography/design-system tools, and Figma-AI-style UI design.

## 0.2.0 — 2026-11-11

Cross-platform Illustrator bridge (Windows + macOS).

- `ILLUSTRATOR_ADAPTER=auto` (default) selects COM on Windows and AppleScript on macOS; explicit `com` / `applescript` / `mock` still supported.
- New `AppleScriptAdapter` + `illustrator-scripts/run-jsx.applescript` (`osascript` → `do javascript file`).
- Detection finds installs under `/Applications` and `~/Applications`, reports `automationAvailable` / `bridge`.
- macOS helper scripts: `scripts/install.sh`, `diagnostics.sh`, `test-bridge.sh`; Claude config example for macOS.
- Font fallbacks include Helvetica Neue / Helvetica / Times for macOS alongside Windows system fonts.

Vector editing, images, artboards, typography and design systems (24 tools, verified against Illustrator 2026 / 30.8 with `pnpm test:e2e:advanced`, 44/44).

- Pathfinder: `pathfinder` (unite, minusFront, intersect, exclude, divide, minusBack), expanded to editable paths. `flip_objects`.
- Path editing: `edit_path_points` (list, move, set_handles, convert, add, remove), `reverse_path`, `set_path_closed`, `split_path`, `join_paths`, `simplify_path` (anchor reduction; Illustrator's Simplify dialog is not scriptable).
- Images: `get_image_info` (link status, effective PPI, always `isVector: false`), `replace_image` (relink keeping bounds), `trace_image` (Image Trace with presets, expanded by default).
- Artboards and documents: `rename_artboard`, `duplicate_artboard` (with artwork), `delete_artboard` (confirm), `list_documents`, `activate_document`.
- `undo` / `redo` by Illustrator step count.
- Typography: `analyze_typography` (type styles plus issues: missing fonts, too many families/sizes, near-duplicate and tiny sizes), `apply_typography` (role rules such as headings >= 24pt to "Montserrat Bold", with `dryRun`).
- Design systems stored as JSON in `output/design-systems/`, independent of documents: `save_design_system`, `list_design_systems`, `get_design_system`, `apply_design_system` (swatch group plus typography roles).

Fixes:
- With several documents open, ops could run against the wrong document, and objects drawn in one call were not found by name in the next (stale `doc.pageItems`; also on the previous code). The bridge now pins the document it last worked on and re-activates it before each op, and each call starts with `app.redraw()`, which refreshes Illustrator's collections.
- The UI/UX Pro Max knowledge loader read from `data/ui-ux-pro-max/`, but the CSVs live in `data/`; 7 unit tests failed. The loader now reads `data/`.
- The ES3 syntax test now also rejects reserved words used as keys or properties (`in:`, `.in`), which ExtendScript refuses to parse.

Figma-AI-style UI design.

- Auto layout: `autoLayout` trees on design plans (stacks with direction, gap, padding, align, justify; hug/fill/percentage sizing; spacers) are measured and flattened into positioned elements before validation. Overflow is reported as a warning.
- UI component library (20 components: button, input, search, card, navbar, app-bar, tab-bar, list-item, avatar, badge, toggle, checkbox, stat, image, chart, progress, divider, status-bar, section-header, sidebar-item) with `<instance> / <part>` naming.
- Design tokens (`tokens`: spacing, radius, fontSize, controlHeight), style-aware; missing UI palette roles are derived, and `palette.subtle` guarantees AA-contrast secondary text.
- 6 UI templates (mobile home, login, settings; landing page; web dashboard; UI kit) and a `wireframe` style. UI briefs are routed automatically.
- 8 tools: `create_app_screen`, `create_landing_page`, `create_web_dashboard`, `create_ui_kit`, `create_ui_design`, `list_ui_components`, `get_design_tokens`, `rename_layers_semantically`.
- Text contrast is validated against the shape beneath the text rather than only the page background.
- Design knowledge from [UI/UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) (MIT, vendored in `data/`): 192 product types with palettes and reasoning, 89 UI styles, 74 font pairings, landing patterns, UX/mobile rules and chart guidance.
  - `search_design_knowledge` and `recommend_design_system` tools.
  - UI briefs automatically use the matched product's palette and font pairing (opt out with `designSystem: false`, or by giving a style or base color); `create_ui_design` takes `product`.
  - New derived palette roles `onPrimary`, `onAccent` and `link` keep text readable on any palette; all 192 product palettes pass the contrast check.

## 0.1.0 — 2026-11-08

Initial implementation.

- MCP server (official TypeScript SDK 1.32.2) with stdio and Streamable HTTP transports; bearer-token and secret-path auth; loopback-by-default.
- 114 tools: document, vector, typography, appearance, objects, layout, layers, export, assets, and AI design engine.
- Design engine: brief analysis, 20 templates, 14 style systems (palettes + typography), strict design-plan schema with semantic validation, compiler, composition analyzer, targeted revisions with versioned plans, variations.
- Illustrator bridge: allowlisted ExtendScript operations, serial queue, timeouts, typed errors, COM adapter via PowerShell, mock adapter for tests.
- PowerShell scripts: install, dependency check, build, launch, diagnostics, bridge test, integration test, token generator.
- 61 automated tests. Real-Illustrator integration suite included; **not yet executed against Illustrator** (see docs/TESTING.md).
