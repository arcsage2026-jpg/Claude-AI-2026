# Installs the MCP Bridge CEP panel into After Effects on Windows and enables
# CEP's debug mode so an unsigned, unpackaged extension is allowed to load.
#
# Run this on the machine that has After Effects installed, from a regular
# (non-admin) PowerShell prompt: powershell -ExecutionPolicy Bypass -File install-windows.ps1

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$extSrc = Join-Path $scriptDir "..\cep-extension" | Resolve-Path
$extDestDir = Join-Path $env:APPDATA "Adobe\CEP\extensions"
$extDest = Join-Path $extDestDir "com.after-effects-mcp.bridge"

New-Item -ItemType Directory -Force -Path $extDestDir | Out-Null

if (Test-Path $extDest) {
    Write-Host "Removing existing extension at $extDest"
    Remove-Item -Recurse -Force $extDest
}

Write-Host "Linking $extSrc -> $extDest"
try {
    New-Item -ItemType Junction -Path $extDest -Target $extSrc | Out-Null
} catch {
    Write-Host "Junction failed ($($_.Exception.Message)); copying files instead."
    Copy-Item -Recurse -Path $extSrc -Destination $extDest
}

Write-Host "Enabling CEP debug mode (allows loading unsigned/unpackaged extensions) for known CSXS versions..."
foreach ($v in 6..12) {
    $key = "HKCU:\Software\Adobe\CSXS.$v"
    New-Item -Path $key -Force | Out-Null
    Set-ItemProperty -Path $key -Name PlayerDebugMode -Value "1"
}

Write-Host ""
Write-Host "Done. Next steps:"
Write-Host "  1. Fully quit and restart After Effects."
Write-Host "  2. Open Window > Extensions > MCP Bridge."
Write-Host "  3. It should show 'Running on port 39843' - leave the panel open."
Write-Host "  4. In another terminal, from after-effects-mcp\: npm install; npm run build; npm start"
Write-Host "     (or point your MCP client at 'node <path-to>\after-effects-mcp\dist\index.js')"
