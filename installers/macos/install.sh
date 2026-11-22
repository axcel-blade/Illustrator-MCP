#!/usr/bin/env bash
# One-line installer for Illustrator MCP on macOS.
#
#   curl -fsSL https://axcel-blade.github.io/Illustrator-MCP-Server/install.sh | bash
#
# Downloads a release from GitHub into ~/Library/Application Support/IllustratorMCP, installs
# production dependencies with pnpm and (optionally) registers it with Claude Desktop.
# Re-running upgrades in place and keeps .env, output/ and logs/.
#
# Options (flags, or environment variables when piped):
#   --version X.Y.Z     ILLUSTRATOR_MCP_VERSION      install a specific version (default: latest)
#   --dir PATH          ILLUSTRATOR_MCP_DIR          install folder
#   --archive FILE                                   use a local release zip (offline / CI)
#   --no-claude         ILLUSTRATOR_MCP_CONFIGURE_CLAUDE=0   do not touch the Claude Desktop config
set -euo pipefail

REPO="axcel-blade/Illustrator-MCP-Server"
VERSION="${ILLUSTRATOR_MCP_VERSION:-}"
INSTALL_DIR="${ILLUSTRATOR_MCP_DIR:-$HOME/Library/Application Support/IllustratorMCP}"
ARCHIVE=""
CONFIGURE_CLAUDE=true
[[ "${ILLUSTRATOR_MCP_CONFIGURE_CLAUDE:-1}" == "0" ]] && CONFIGURE_CLAUDE=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --version) VERSION="${2#v}"; shift 2 ;;
    --dir) INSTALL_DIR="$2"; shift 2 ;;
    --archive) ARCHIVE="$2"; shift 2 ;;
    --no-claude) CONFIGURE_CLAUDE=false; shift ;;
    --configure-claude) CONFIGURE_CLAUDE=true; shift ;;
    -h|--help) sed -n '2,16p' "$0"; exit 0 ;;
    *) echo "Unknown option: $1" >&2; exit 2 ;;
  esac
done

step() { printf '\033[36m==> %s\033[0m\n' "$*"; }
ok() { printf '\033[32m  ok  %s\033[0m\n' "$*"; }
die() { printf '\033[31m  !!  %s\033[0m\n' "$*" >&2; exit 1; }

if [[ "$(uname -s)" != "Darwin" && "${ILLUSTRATOR_MCP_ALLOW_ANY_OS:-}" != "1" ]]; then
  die "This installer is for macOS. On Windows use: irm https://axcel-blade.github.io/Illustrator-MCP-Server/install.ps1 | iex"
fi

# ---------------------------------------------------------------- prerequisites
step "Checking Node.js"
command -v node >/dev/null 2>&1 || die "Node.js 20+ is required: https://nodejs.org (or: brew install node)"
NODE_VERSION="$(node -v | sed 's/^v//')"
[[ "${NODE_VERSION%%.*}" -ge 20 ]] || die "Node.js 20+ is required (found $NODE_VERSION)"
ok "node $NODE_VERSION"

step "Checking pnpm"
command -v pnpm >/dev/null 2>&1 || corepack enable >/dev/null 2>&1 || true
command -v pnpm >/dev/null 2>&1 || die "pnpm is required: run 'corepack enable' (may need sudo) or see https://pnpm.io/installation"
ok "pnpm $(pnpm -v)"
command -v unzip >/dev/null 2>&1 || die "unzip is required"

# ---------------------------------------------------------------- download
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
FROM_SOURCE=false

if [[ -n "$ARCHIVE" ]]; then
  ZIP="$(cd "$(dirname "$ARCHIVE")" && pwd)/$(basename "$ARCHIVE")"
  step "Using local archive $ZIP"
else
  step "Finding release"
  if [[ -n "$VERSION" ]]; then API="https://api.github.com/repos/$REPO/releases/tags/v${VERSION#v}"; else API="https://api.github.com/repos/$REPO/releases/latest"; fi
  REL="$TMP/release.json"
  curl -fsSL -H "Accept: application/vnd.github+json" -A "illustrator-mcp-installer" "$API" -o "$REL" || die "Could not read $API"
  # Parse with Node (always present here) instead of requiring jq.
  read -r TAG ASSET_NAME ASSET_URL SUM_URL ZIPBALL < <(node -e '
    const r = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
    const a = (r.assets || []).find((x) => /^illustrator-mcp-.*\.zip$/.test(x.name));
    const s = a && (r.assets || []).find((x) => x.name === a.name + ".sha256");
    console.log([r.tag_name, a ? a.name : "-", a ? a.browser_download_url : "-", s ? s.browser_download_url : "-", r.zipball_url].join(" "));
  ' "$REL")
  if [[ "$ASSET_NAME" == "-" ]]; then
    step "$TAG has no prebuilt package; downloading source to build locally"
    ASSET_NAME="source-$TAG.zip"; ASSET_URL="$ZIPBALL"
  fi
  ZIP="$TMP/$ASSET_NAME"
  step "Downloading $ASSET_NAME ($TAG)"
  curl -fsSL -A "illustrator-mcp-installer" "$ASSET_URL" -o "$ZIP"
  if [[ "$SUM_URL" != "-" ]]; then
    EXPECTED="$(curl -fsSL "$SUM_URL" | awk '{print $1}')"
    ACTUAL="$(shasum -a 256 "$ZIP" | awk '{print $1}')"
    [[ "$EXPECTED" == "$ACTUAL" ]] || die "Checksum mismatch for $ASSET_NAME"
    ok "checksum verified"
  fi
fi

step "Extracting"
unzip -q "$ZIP" -d "$TMP/x"
SRC="$(find "$TMP/x" -mindepth 1 -maxdepth 1 -type d | head -n 1)"
[[ -n "$SRC" ]] || die "Archive is empty"
if [[ ! -f "$SRC/dist/index.js" ]]; then
  [[ -f "$SRC/package.json" ]] || die "Archive contains neither dist/index.js nor package.json"
  step "Building from source (pnpm install + build)"
  (cd "$SRC" && CI=true pnpm install --frozen-lockfile --ignore-scripts && pnpm build && rm -rf node_modules) || die "Build failed"
  FROM_SOURCE=true
fi

# ---------------------------------------------------------------- install / upgrade
step "Installing to $INSTALL_DIR"
mkdir -p "$INSTALL_DIR"
# Replace program files; keep user data (.env, output, logs) and node_modules for a fast reinstall.
find "$INSTALL_DIR" -mindepth 1 -maxdepth 1 ! -name .env ! -name output ! -name logs ! -name node_modules -exec rm -rf {} +
for entry in "$SRC"/* "$SRC"/.[!.]*; do
  [[ -e "$entry" ]] || continue
  name="$(basename "$entry")"
  if [[ ( "$name" == "output" || "$name" == "logs" ) && -e "$INSTALL_DIR/$name" ]]; then continue; fi
  cp -R "$entry" "$INSTALL_DIR/"
done
(cd "$INSTALL_DIR" && CI=true pnpm install --prod --frozen-lockfile --ignore-scripts) || die "pnpm install failed"
[[ -f "$INSTALL_DIR/.env" ]] || cp "$INSTALL_DIR/.env.example" "$INSTALL_DIR/.env"
mkdir -p "$HOME/Documents/IllustratorMCP"

ENTRY="$INSTALL_DIR/dist/index.js"
# Check the build loads without starting the stdio server.
node -e 'import(require("url").pathToFileURL(process.argv[1]).href).catch((e) => { console.error(e); process.exit(1); })' "$INSTALL_DIR/dist/config/index.js" \
  || die "The installed server does not load"
INSTALLED="$(node -p 'require(process.argv[1]).version' "$INSTALL_DIR/package.json")"
ok "Illustrator MCP $INSTALLED$([[ "$FROM_SOURCE" == true ]] && echo ' (built from source)')"

# ---------------------------------------------------------------- Claude Desktop
SNIPPET_NODE='const entry = process.argv[1];
const server = { command: "node", args: [entry], env: { ILLUSTRATOR_ADAPTER: "applescript" } };'
if [[ "$CONFIGURE_CLAUDE" == true ]]; then
  step "Registering with Claude Desktop"
  CFG="$HOME/Library/Application Support/Claude/claude_desktop_config.json"
  mkdir -p "$(dirname "$CFG")"
  [[ -f "$CFG" ]] && cp "$CFG" "$CFG.bak"
  node -e "$SNIPPET_NODE"'
    const fs = require("fs"); const path = process.argv[2];
    let cfg = {};
    if (fs.existsSync(path)) { const raw = fs.readFileSync(path, "utf8").trim(); if (raw) cfg = JSON.parse(raw); }
    cfg.mcpServers = { ...(cfg.mcpServers || {}), illustrator: server };
    fs.writeFileSync(path, JSON.stringify(cfg, null, 2) + "\n");
  ' "$ENTRY" "$CFG"
  ok "Updated $CFG (restart Claude Desktop)"
else
  step "Add this to ~/Library/Application Support/Claude/claude_desktop_config.json:"
  node -e "$SNIPPET_NODE"'console.log(JSON.stringify({ mcpServers: { illustrator: server } }, null, 2));' "$ENTRY"
fi

echo
printf '\033[32mIllustrator MCP installed in %s\033[0m\n' "$INSTALL_DIR"
echo "Allow automation the first time: System Settings > Privacy & Security > Automation > (your terminal / Claude) > Adobe Illustrator."
echo "Check the Illustrator bridge with: bash \"$INSTALL_DIR/scripts/diagnostics.sh\""
