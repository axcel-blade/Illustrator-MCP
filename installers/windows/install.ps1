<#
.SYNOPSIS
  One-line installer for Illustrator MCP on Windows.
.DESCRIPTION
  Downloads a release of Illustrator MCP from GitHub, installs it to
  %LOCALAPPDATA%\IllustratorMCP, installs production dependencies with pnpm and (optionally)
  registers it with Claude Desktop. Re-running upgrades in place and keeps .env, output\ and logs\.

  irm https://axcel-blade.github.io/Illustrator-MCP-Server/install.ps1 | iex

  Options when piped (environment variables):
    ILLUSTRATOR_MCP_VERSION=1.0.0       install a specific version (default: latest release)
    ILLUSTRATOR_MCP_DIR=D:\Tools\IllMCP  install folder
    ILLUSTRATOR_MCP_CONFIGURE_CLAUDE=0   do not touch the Claude Desktop config
.EXAMPLE
  powershell -ExecutionPolicy Bypass -File install.ps1 -Version 1.0.0 -ConfigureClaude
#>
[CmdletBinding()]
param(
  [string]$Version = $env:ILLUSTRATOR_MCP_VERSION,
  [string]$InstallDir = $env:ILLUSTRATOR_MCP_DIR,
  # Local release zip (used by CI and for offline installs) instead of downloading.
  [string]$Archive,
  [switch]$ConfigureClaude,
  [switch]$NoClaude
)
$fromSource = $false
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$Repo = 'axcel-blade/Illustrator-MCP-Server'

function Write-Step($m) { Write-Host "==> $m" -ForegroundColor Cyan }
function Write-Ok($m) { Write-Host "  ok  $m" -ForegroundColor Green }
function Stop-Install($m) { Write-Host "  !!  $m" -ForegroundColor Red; throw $m }

if (-not $InstallDir) { $InstallDir = Join-Path $env:LOCALAPPDATA 'IllustratorMCP' }
if (-not $NoClaude -and $env:ILLUSTRATOR_MCP_CONFIGURE_CLAUDE -ne '0') { $ConfigureClaude = $true }
[Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12

# ---------------------------------------------------------------- prerequisites
Write-Step 'Checking Node.js'
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) { Stop-Install 'Node.js 20+ is required: https://nodejs.org (or: winget install OpenJS.NodeJS.LTS)' }
$nodeVersion = (& node -v).TrimStart('v')
if ([int]($nodeVersion.Split('.')[0]) -lt 20) { Stop-Install "Node.js 20+ is required (found $nodeVersion)" }
Write-Ok "node $nodeVersion"

Write-Step 'Checking pnpm'
if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
  try { & corepack enable 2>$null | Out-Null } catch { }
}
if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) { Stop-Install 'pnpm is required: run "corepack enable" as administrator or see https://pnpm.io/installation' }
Write-Ok ("pnpm " + (& pnpm -v))

# ---------------------------------------------------------------- download
$tmp = Join-Path ([IO.Path]::GetTempPath()) ("illustrator-mcp-" + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Force $tmp | Out-Null
try {
  if ($Archive) {
    $zip = (Resolve-Path $Archive).Path
    Write-Step "Using local archive $zip"
  } else {
    Write-Step 'Finding release'
    $api = if ($Version) { "https://api.github.com/repos/$Repo/releases/tags/v$($Version.TrimStart('v'))" } else { "https://api.github.com/repos/$Repo/releases/latest" }
    $rel = Invoke-RestMethod -Uri $api -Headers @{ 'User-Agent' = 'illustrator-mcp-installer'; Accept = 'application/vnd.github+json' }
    $asset = $rel.assets | Where-Object { $_.name -like 'illustrator-mcp-*.zip' } | Select-Object -First 1
    if (-not $asset) {
      # Releases made before the CD workflow carry no prebuilt zip: build from the source archive.
      Write-Step "$($rel.tag_name) has no prebuilt package; downloading source to build locally"
      $asset = [pscustomobject]@{ name = "source-$($rel.tag_name).zip"; browser_download_url = $rel.zipball_url }
      $fromSource = $true
    }
    $zip = Join-Path $tmp $asset.name
    Write-Step "Downloading $($asset.name) ($($rel.tag_name))"
    Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $zip -UseBasicParsing
    $sumAsset = $rel.assets | Where-Object { $_.name -eq "$($asset.name).sha256" } | Select-Object -First 1
    if ($sumAsset) {
      $expected = ((Invoke-WebRequest -Uri $sumAsset.browser_download_url -UseBasicParsing).Content -split '\s+')[0]
      $actual = (Get-FileHash $zip -Algorithm SHA256).Hash.ToLower()
      if ($expected.ToLower() -ne $actual) { Stop-Install "Checksum mismatch for $($asset.name)" }
      Write-Ok 'checksum verified'
    }
  }

  Write-Step 'Extracting'
  $extract = Join-Path $tmp 'x'
  Expand-Archive -Path $zip -DestinationPath $extract -Force
  $src = Get-ChildItem $extract -Directory | Select-Object -First 1
  if (-not $src) { Stop-Install 'Archive is empty' }
  if (-not (Test-Path (Join-Path $src.FullName 'dist\index.js'))) {
    if (-not (Test-Path (Join-Path $src.FullName 'package.json'))) { Stop-Install 'Archive contains neither dist\index.js nor package.json' }
    Write-Step 'Building from source (pnpm install + build)'
    Push-Location $src.FullName
    try {
      $env:CI = 'true'
      & pnpm install --frozen-lockfile --ignore-scripts; if ($LASTEXITCODE -ne 0) { Stop-Install 'pnpm install failed' }
      & pnpm build; if ($LASTEXITCODE -ne 0) { Stop-Install 'pnpm build failed' }
      Remove-Item node_modules -Recurse -Force
    } finally { Pop-Location }
    $fromSource = $true
  }

  # ---------------------------------------------------------------- install / upgrade
  Write-Step "Installing to $InstallDir"
  New-Item -ItemType Directory -Force $InstallDir | Out-Null
  # Replace program files; keep user data (.env, output, logs).
  $keep = @('.env', 'output', 'logs', 'node_modules')
  Get-ChildItem $InstallDir -Force | Where-Object { $keep -notcontains $_.Name } | Remove-Item -Recurse -Force
  Get-ChildItem $src.FullName -Force | Where-Object { -not (($_.Name -eq 'output' -or $_.Name -eq 'logs') -and (Test-Path (Join-Path $InstallDir $_.Name))) } |
    Copy-Item -Destination $InstallDir -Recurse -Force

  Push-Location $InstallDir
  try {
    $env:CI = 'true'  # non-interactive pnpm
    & pnpm install --prod --frozen-lockfile --ignore-scripts
    if ($LASTEXITCODE -ne 0) { Stop-Install 'pnpm install failed' }
  } finally { Pop-Location }

  if (-not (Test-Path (Join-Path $InstallDir '.env'))) { Copy-Item (Join-Path $InstallDir '.env.example') (Join-Path $InstallDir '.env') }
  $docs = Join-Path ([Environment]::GetFolderPath('MyDocuments')) 'IllustratorMCP'
  New-Item -ItemType Directory -Force $docs | Out-Null

  $entry = Join-Path $InstallDir 'dist\index.js'
  # Check the build loads (syntax/deps) without starting the stdio server.
  & node -e "import(process.argv[1]).catch(e=>{console.error(e);process.exit(1)})" "file:///$((Join-Path $InstallDir 'dist\config\index.js') -replace '\\','/')"
  if ($LASTEXITCODE -ne 0) { Stop-Install 'The installed server does not load' }
  $installed = (Get-Content (Join-Path $InstallDir 'package.json') -Raw | ConvertFrom-Json).version
  Write-Ok "Illustrator MCP $installed$(if ($fromSource) { ' (built from source)' })"

  # ---------------------------------------------------------------- Claude Desktop
  $server = [pscustomobject]@{ command = 'node'; args = @($entry); env = [pscustomobject]@{ ILLUSTRATOR_ADAPTER = 'com' } }
  if ($ConfigureClaude) {
    Write-Step 'Registering with Claude Desktop'
    $cfgPath = Join-Path $env:APPDATA 'Claude\claude_desktop_config.json'
    New-Item -ItemType Directory -Force (Split-Path $cfgPath) | Out-Null
    if (Test-Path $cfgPath) {
      Copy-Item $cfgPath "$cfgPath.bak" -Force
      $raw = Get-Content $cfgPath -Raw
      $cfg = if ($raw.Trim()) { $raw | ConvertFrom-Json } else { [pscustomobject]@{} }
    } else { $cfg = [pscustomobject]@{} }
    if (-not $cfg.PSObject.Properties['mcpServers']) { $cfg | Add-Member -NotePropertyName mcpServers -NotePropertyValue ([pscustomobject]@{}) }
    $cfg.mcpServers | Add-Member -NotePropertyName illustrator -NotePropertyValue $server -Force
    $cfg | ConvertTo-Json -Depth 10 | Set-Content -Path $cfgPath -Encoding utf8
    Write-Ok "Updated $cfgPath (restart Claude Desktop)"
  } else {
    Write-Step 'Add this to %APPDATA%\Claude\claude_desktop_config.json:'
    Write-Host (@{ mcpServers = @{ illustrator = $server } } | ConvertTo-Json -Depth 10)
  }

  Write-Host ''
  Write-Host "Illustrator MCP installed in $InstallDir" -ForegroundColor Green
  Write-Host "Check the Illustrator bridge with: powershell -ExecutionPolicy Bypass -File `"$InstallDir\scripts\diagnostics.ps1`""
} finally {
  Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue
}
