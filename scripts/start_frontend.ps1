$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$frontendDir = Join-Path $repoRoot "frontend"

if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
    throw "npm was not found. Install Node.js 16+ and try again."
}

Set-Location $frontendDir

Write-Host "Starting frontend on http://localhost:3000 ..." -ForegroundColor Cyan
& npm.cmd run dev
