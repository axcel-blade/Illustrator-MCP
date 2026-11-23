# Configuration

Illustrator MCP is configured with environment variables. They can come from three places;
earlier ones win:

1. **Command line** — `--transport stdio|http` overrides `MCP_TRANSPORT`.
2. **The MCP client's `env` block** (Claude Desktop `claude_desktop_config.json`, ChatGPT connector host, shell).
3. **A `.env` file** in the install folder (copy [`.env.example`](../.env.example)), or the file named by
   `ILLUSTRATOR_MCP_ENV_FILE`. Requires Node.js 20.12+; values already set by 1–2 are never overridden.

Run `node dist/index.js --version` to print the installed version.

## Settings

| Variable | Default | Values | Purpose |
|---|---|---|---|
| `MCP_TRANSPORT` | `stdio` | `stdio`, `http` | `stdio` for Claude Desktop; `http` (Streamable HTTP) for ChatGPT and remote clients |
| `MCP_HTTP_HOST` | `127.0.0.1` | host/IP | Bind address for `http`. Non-loopback hosts **require** `MCP_AUTH_TOKEN` or `MCP_SECRET_PATH` |
| `MCP_HTTP_PORT` | `3333` | 1–65535 | Port for `http` |
| `MCP_AUTH_TOKEN` | — | ≥ 24 chars | Bearer token required on every HTTP request. Generate with `scripts/new-token.ps1` or `openssl rand -hex 24` |
| `MCP_SECRET_PATH` | — | ≥ 24 chars | Secret URL path segment for clients that cannot send headers (ChatGPT "No authentication") |
| `ILLUSTRATOR_ADAPTER` | `auto` | `auto`, `com`, `applescript`, `mock` | Bridge to Illustrator. `auto` = COM on Windows, AppleScript on macOS. `mock` is for tests only and labels every result as simulated |
| `ILLUSTRATOR_TIMEOUT_MS` | `60000` | 1000–600000 | Per-operation timeout. Raise it for very large documents or exports |
| `ILLUSTRATOR_JOB_TIMEOUT_MS` | `900000` | 10000–3600000 | Per-call timeout inside background jobs (`background: true`). Long plans and batch exports run here instead of blocking the MCP request |
| `ILLUSTRATOR_AUTO_LAUNCH` | `true` | `true`, `false` | Start Illustrator when it is not running. `false` returns `ILLUSTRATOR_NOT_RUNNING` instead |
| `ALLOWED_PATHS` | `./output;~/Documents/IllustratorMCP` | `;`-separated dirs | The only directories tools may open, place, save or export to. Everything else is rejected with `PATH_NOT_ALLOWED` |
| `LOG_LEVEL` | `info` | `debug`, `info`, `warn`, `error` | Log verbosity |
| `LOG_DIR` | `logs` | path | Log folder, relative to the install folder |
| `ILLUSTRATOR_MCP_ENV_FILE` | `<install>/.env` | path | Alternative settings file (set it in the client's `env` block) |

## Examples

### Claude Desktop (Windows)

`%APPDATA%\Claude\claude_desktop_config.json` — see also [`examples/claude_desktop_config.json`](../examples/claude_desktop_config.json):

```json
{
  "mcpServers": {
    "illustrator": {
      "command": "node",
      "args": ["C:\Users\you\AppData\Local\IllustratorMCP\dist\index.js"],
      "env": { "ILLUSTRATOR_ADAPTER": "com", "ALLOWED_PATHS": "C:\Users\you\Documents\IllustratorMCP" }
    }
  }
}
```

### Claude Desktop (macOS)

`~/Library/Application Support/Claude/claude_desktop_config.json` — see [`examples/claude_desktop_config.macos.json`](../examples/claude_desktop_config.macos.json).

### Remote HTTP (ChatGPT)

```env
MCP_TRANSPORT=http
MCP_HTTP_HOST=0.0.0.0
MCP_HTTP_PORT=3333
MCP_AUTH_TOKEN=<48 hex chars>
```

Put it behind an HTTPS tunnel or reverse proxy; see [INSTALLATION.md](INSTALLATION.md) §5 and [SECURITY.md](SECURITY.md).

## Install locations used by the one-line installers

| OS | Program folder |
|---|---|
| Windows | `%LOCALAPPDATA%\IllustratorMCP` |
| macOS | `~/Library/Application Support/IllustratorMCP` |

Both create `~/Documents/IllustratorMCP` as the default output folder.

## MCP clients the installers configure

The installers add a server named `illustrator` (`node <install>/dist/index.js`, with `ILLUSTRATOR_ADAPTER`
set to `com` on Windows or `applescript` on macOS) to every client they find. Claude Desktop is always
configured; the others only when their config folder exists, meaning the client is installed.

| Client | Windows | macOS |
|---|---|---|
| Claude Desktop | `%APPDATA%\Claude\claude_desktop_config.json`, plus the Microsoft Store build under `%LOCALAPPDATA%\Packages\Claude_*\LocalCache\Roaming\Claude\` | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Claude Code | `claude mcp add --scope user illustrator …` | same |
| Cursor | `~/.cursor/mcp.json` | same |
| Windsurf | `~/.codeium/windsurf/mcp_config.json` | same |
| VS Code / Insiders (Copilot) | `%APPDATA%\Code\User\mcp.json` (key `servers`) | `~/Library/Application Support/Code/User/mcp.json` |
| Cline | `%APPDATA%\Code\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json` | same path under `~/Library/Application Support/` |
| Roo Code | `%APPDATA%\Code\User\globalStorage\rooveterinaryinc.roo-cline\settings\mcp_settings.json` | same path under `~/Library/Application Support/` |
| Gemini CLI | `~/.gemini/settings.json` | same |
| Codex | `codex mcp add illustrator …`, otherwise `~/.codex/config.toml` | same |

- Existing files are **merged**: other servers and settings are kept, and the previous file is saved as
  `<file>.illustrator-mcp.bak`. Re-running the installer updates the entry instead of adding a second one.
- Files that are not plain JSON (for example a VS Code `mcp.json` with comments) are left untouched, with a
  warning to add the entry by hand.
- Skip all of this with `-NoClients` (Windows), `--no-clients` (macOS) or `ILLUSTRATOR_MCP_CONFIGURE_CLIENTS=0`;
  the installer then prints the JSON snippet instead.
- After installing, **fully quit and reopen** each client so it starts the server.
