# Connecting MCP clients

The one-line installer ([README](../README.md#one-line-install)) registers the server with every client it finds:
Claude Desktop, Claude Code, Cursor, Windsurf, VS Code (Copilot), Cline, Roo Code, Gemini CLI and Codex.
Use this page to set a client up by hand or to check what the installer wrote.

Every client starts the same local process over **stdio**:

| Setting | Windows | macOS |
|---|---|---|
| command | `node` | `node` |
| args | `C:\path\to\Illustrator-MCP\dist\index.js` | `/path/to/Illustrator-MCP/dist/index.js` |
| env `ILLUSTRATOR_ADAPTER` | `com` (or `auto`) | `applescript` (or `auto`) |
| env `ALLOWED_PATHS` (optional) | `C:\Users\you\Documents\IllustratorMCP;C:\Users\you\Desktop\Illustrator` | `/Users/you/Documents/IllustratorMCP` |

`ALLOWED_PATHS` lists the only folders the server may read or write (`;`-separated on both systems). Add any folder
you want designs saved to; paths outside it are refused with `PATH_NOT_ALLOWED`. Other settings: [CONFIGURATION.md](CONFIGURATION.md).

After changing a client's configuration, restart the client (or reload its MCP servers) so it starts the new process.
Verify by asking the assistant to run `illustrator_status` with `probe: true`.

Paths in JSON need doubled backslashes on Windows (`C:\\path\\to\\...`).

## Claude Desktop

`%APPDATA%\Claude\claude_desktop_config.json` (Windows) or `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS):

```json
{
  "mcpServers": {
    "illustrator": {
      "command": "node",
      "args": ["C:\\path\\to\\Illustrator-MCP\\dist\\index.js"],
      "env": { "ILLUSTRATOR_ADAPTER": "com", "ALLOWED_PATHS": "C:\\Users\\you\\Documents\\IllustratorMCP" }
    }
  }
}
```

Ready-made files: [examples/claude_desktop_config.json](../examples/claude_desktop_config.json),
[examples/claude_desktop_config.macos.json](../examples/claude_desktop_config.macos.json). Quit Claude Desktop fully
(tray / menu bar) and reopen it.

## Claude Code

User scope (all projects):

```powershell
claude mcp add --scope user illustrator -e ILLUSTRATOR_ADAPTER=com -e "ALLOWED_PATHS=C:\Users\you\Documents\IllustratorMCP" -- node C:\path\to\Illustrator-MCP\dist\index.js
```

Project scope instead: run the same command with `--scope project`, which writes `.mcp.json` in the project
([examples/mcp.json](../examples/mcp.json) shows the format). Check with `claude mcp list`. In the Claude desktop
app's Code tab, start a new session after adding the server.

## Cursor

`%USERPROFILE%\.cursor\mcp.json` (global) or `.cursor/mcp.json` in a project. Same `mcpServers` format as Claude Desktop:
[examples/cursor.mcp.json](../examples/cursor.mcp.json). Then open *Settings → MCP* and check that `illustrator` is enabled.

## VS Code (GitHub Copilot agent mode)

VS Code uses a `servers` key with an explicit `type`. User configuration: `%APPDATA%\Code\User\mcp.json`
(Windows) or `~/Library/Application Support/Code/User/mcp.json` (macOS); per workspace: `.vscode/mcp.json`.

```json
{
  "servers": {
    "illustrator": {
      "type": "stdio",
      "command": "node",
      "args": ["C:\\path\\to\\Illustrator-MCP\\dist\\index.js"],
      "env": { "ILLUSTRATOR_ADAPTER": "com" }
    }
  }
}
```

Example: [examples/vscode.mcp.json](../examples/vscode.mcp.json). Start the server from the *MCP: List Servers*
command or the code lens in `mcp.json`, then pick the tools in Copilot Chat's agent mode.
Cline and Roo Code (VS Code extensions) use the `mcpServers` format in their own settings files; the installer writes those too.

## Windsurf, Gemini CLI, Codex

| Client | File | Format |
|---|---|---|
| Windsurf | `~/.codeium/windsurf/mcp_config.json` | `mcpServers` (as Claude Desktop) |
| Gemini CLI | `~/.gemini/settings.json` | `mcpServers` (as Claude Desktop) |
| Codex | `~/.codex/config.toml`, or `codex mcp add illustrator --env ILLUSTRATOR_ADAPTER=com -- node <path>` | `[mcp_servers.illustrator]` with `command`, `args`, `env` |

## ForgePilot and other MCP clients

This project has not been tested with ForgePilot. Any client that can launch a **stdio** MCP server works with the
settings in the table at the top: command `node`, the path to `dist/index.js` as the only argument, and the
environment variables. Look for an "MCP servers" or "tools" section in the client's settings. Most use the
`mcpServers` JSON format shown for Claude Desktop.

Clients that only connect to **remote** servers (by URL) need the HTTP transport instead:
start `node dist/index.js --transport http` with `MCP_AUTH_TOKEN` (sent as `Authorization: Bearer <token>`) or
`MCP_SECRET_PATH` set, and connect to `http://127.0.0.1:3333/mcp`. For clients outside your machine, put an HTTPS
tunnel in front, as described for ChatGPT in [INSTALLATION.md](INSTALLATION.md#5-chatgpt-remote-mcp-over-https).

## Troubleshooting

- **Tools don't appear**: the client didn't restart, the path to `dist/index.js` is wrong, or `pnpm build` wasn't run.
- **`PATH_NOT_ALLOWED`**: add the folder to `ALLOWED_PATHS` and restart the client.
- **`BRIDGE_TIMEOUT`**: close modal dialogs in Illustrator; for big designs pass `background: true` and use `wait_for_job`.
- More: [TROUBLESHOOTING.md](TROUBLESHOOTING.md).
