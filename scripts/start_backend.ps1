$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$backendDir = Join-Path $repoRoot "backend"
$venvPython = Join-Path $backendDir "venv\Scripts\python.exe"

if (-not (Test-Path $venvPython)) {
    throw "Backend virtual environment not found. Run setup_windows.bat first."
}

Set-Location $backendDir
$env:PORT = "5001"

Write-Host "Starting backend on http://localhost:5001 ..." -ForegroundColor Cyan
& $venvPython "run.py"
