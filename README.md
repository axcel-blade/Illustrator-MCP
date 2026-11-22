# Illustrator MCP

[![CI](https://github.com/axcel-blade/Illustrator-MCP-Server/actions/workflows/ci.yml/badge.svg)](https://github.com/axcel-blade/Illustrator-MCP-Server/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/axcel-blade/Illustrator-MCP-Server?sort=semver)](https://github.com/axcel-blade/Illustrator-MCP-Server/releases/latest)
[![License: MIT](https://img.shields.io/github/license/axcel-blade/Illustrator-MCP-Server)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20-339933?logo=node.js&logoColor=white)](package.json)
[![MCP](https://img.shields.io/badge/MCP-server-6E56CF)](https://modelcontextprotocol.io)
[![Installer](https://github.com/axcel-blade/Illustrator-MCP-Server/actions/workflows/installer.yml/badge.svg)](https://github.com/axcel-blade/Illustrator-MCP-Server/actions/workflows/installer.yml)
[![Docs](https://img.shields.io/badge/docs-site-D9570D)](https://axcel-blade.github.io/Illustrator-MCP-Server/)

An MCP server that lets AI assistants (Claude Desktop, ChatGPT) design in **Adobe Illustrator**: it turns
natural-language briefs — posters, logos, brand work and, Figma-AI-style, app screens, landing pages, dashboards and UI kits — into structured design plans, builds them as **editable vector artwork**, inspects
the result, exports previews and applies targeted revisions.

```
AI client (Claude Desktop: stdio · ChatGPT: HTTPS)
        │  MCP
        ▼
MCP server ── 178 tools, resources, prompts, validation, auth
        │
        ▼
AI design engine ── brief analysis → plan JSON → validation → compile; critique, revision, variations
        │
        ▼
Illustrator bridge ── allowlisted ops · serial queue · timeouts · typed errors
        │  Windows: PowerShell → COM DoJavaScriptFile
        │  macOS:   osascript → AppleScript do javascript file
        ▼
Adobe Illustrator ── ExtendScript ops (illustrator-scripts/*.jsx)
```

## Status

| Area | State |
|---|---|
| MCP server (stdio + Streamable HTTP), 178 tools, resources, prompts | Implemented, covered by automated tests |
| Design engine (planner, 26 templates incl. UI screens, 15 styles, auto layout, UI components, design tokens, UI/UX Pro Max design knowledge, validator, compiler, analyzer, revisions, variations) | Implemented, covered by automated tests |
| Bridge (queue, timeouts, allowlist, error mapping, COM + AppleScript runners, document pinning) | Implemented; Windows COM verified with Illustrator; macOS AppleScript adapter added |
| ExtendScript operations inside a real Illustrator | Verified against Illustrator 2026 (30.8) on Windows with `pnpm test:e2e`, `test:e2e:design` and `test:e2e:advanced` (44/44); see [docs/TEST_REPORT.md](docs/TEST_REPORT.md) |
| ChatGPT remote connection | Transport implemented and tested locally; not verified against ChatGPT |

See [docs/LIMITATIONS.md](docs/LIMITATIONS.md) for details.

## Quick start

Requirements: **Windows 10/11 or macOS**, Node.js 20+, pnpm (via Corepack), Adobe Illustrator 2020 or later.

### One-line install

Installs the latest release and registers it with Claude Desktop (read the scripts first:
[install.ps1](installers/windows/install.ps1), [install.sh](installers/macos/install.sh)).

```powershell
irm https://axcel-blade.github.io/Illustrator-MCP-Server/install.ps1 | iex
```

```bash
curl -fsSL https://axcel-blade.github.io/Illustrator-MCP-Server/install.sh | bash
```

Settings: [docs/CONFIGURATION.md](docs/CONFIGURATION.md). To build from source instead:

### Windows (from source)

```powershell
corepack enable
pnpm install
pnpm build
powershell -ExecutionPolicy Bypass -File scripts\install.ps1 -ConfigureClaude
powershell -ExecutionPolicy Bypass -File scripts\diagnostics.ps1
```

### macOS (from source)

```bash
corepack enable
pnpm install
pnpm build
chmod +x scripts/*.sh
./scripts/install.sh --configure-claude
./scripts/diagnostics.sh
```

On first use, macOS may ask to allow Terminal/Node to control Illustrator
(System Settings → Privacy & Security → Automation).

Restart Claude Desktop, then ask: *"Check Illustrator status, then create a modern luxury skincare poster with a
minimalist layout, beige background, elegant typography and a product image."*

## Commands

| Command | Purpose |
|---|---|
| `pnpm install` | Install dependencies (pnpm only — no npm/yarn lockfiles) |
| `pnpm dev` | Run from source with reload |
| `pnpm build` | Compile TypeScript to `dist/` |
| `pnpm start` | Start (stdio). `pnpm start:http` for HTTP |
| `pnpm test` | Automated tests (mock adapter, no Illustrator needed) |
| `pnpm test:integration` | Manual tests against the real Illustrator |
| `pnpm test:e2e` | Full end-to-end suite against the real Illustrator (closes all open documents without saving) |
| `pnpm test:e2e:design` / `test:e2e:advanced` / `test:e2e:extended` | Design build + exports / advanced tools (pathfinder, paths, images, artboards, typography, design systems) / extended tools (offset, outline stroke, blends, styles, swatches, symbols, area text, data merge, batch export); use only their own document |
| `pnpm test:e2e:http` / `test:e2e:reconnect` | HTTP transport / Illustrator quit-and-relaunch |
| `pnpm lint` / `pnpm typecheck` | Static checks |
| `node scripts/pack-release.mjs` | Build the release package (`release/illustrator-mcp-X.Y.Z.zip`) the installers download |
| `pnpm --dir site dev` | Run the docs site locally (renders `docs/*.md`) |
| `docker compose -f site/docker-compose.yml up --build -d` | Docs site in Docker (nginx) at http://localhost:8080 (`SITE_PORT` to change); `docker-compose.dev.yml` for hot reload on :4321 |

## Documentation

- **Docs site: https://axcel-blade.github.io/Illustrator-MCP-Server/**
- [Installation (Windows & macOS)](docs/INSTALLATION.md) — pnpm, Illustrator, Claude Desktop, ChatGPT · [Configuration](docs/CONFIGURATION.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Tool reference](docs/TOOLS.md) (generated) · [Example prompts](docs/EXAMPLES.md)
- [UI design: auto layout, components, tokens](docs/UI_DESIGN.md)
- [Design plan schema](docs/DESIGN_SCHEMA.md) · [Coordinate convention](docs/COORDINATES.md)
- [Security](docs/SECURITY.md) · [Testing](docs/TESTING.md) · [Troubleshooting](docs/TROUBLESHOOTING.md)
- [Development & extension guide](docs/DEVELOPMENT.md) · [Known limitations](docs/LIMITATIONS.md)
- [Contributing](CONTRIBUTING.md) · [Code of Conduct](CODE_OF_CONDUCT.md) · [Security policy](SECURITY.md) · [Support](SUPPORT.md)

## License

MIT — see [LICENSE](LICENSE).

Design knowledge in [`data/`](data) comes from
[UI/UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) © 2024 Next Level Builder, MIT License.
