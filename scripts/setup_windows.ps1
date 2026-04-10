$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$backendDir = Join-Path $repoRoot "backend"
$frontendDir = Join-Path $repoRoot "frontend"
$venvDir = Join-Path $backendDir "venv"
$venvPython = Join-Path $venvDir "Scripts\python.exe"

Write-Host "Setting up Energy Auditing for Windows..." -ForegroundColor Cyan

if (-not (Get-Command py -ErrorAction SilentlyContinue)) {
    throw "Python launcher 'py' was not found. Install Python 3.10 and try again."
}

$pythonList = & py -0p 2>$null
if ($pythonList -notmatch "3\.10") {
    throw "Python 3.10 was not found. Install Python 3.10 first, then re-run this script."
}

if (-not (Test-Path $venvPython)) {
    Write-Host "Creating backend virtual environment with Python 3.10..." -ForegroundColor Yellow
    & py -3.10 -m venv $venvDir
}

Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
& $venvPython -m pip install --upgrade pip
& $venvPython -m pip install -r (Join-Path $backendDir "requirements.txt")

if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
    throw "npm was not found. Install Node.js 16+ and try again."
}

Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
Push-Location $frontendDir
try {
    & npm.cmd install
}
finally {
    Pop-Location
}

Write-Host ""
Write-Host "Setup complete." -ForegroundColor Green
Write-Host "Next steps:" -ForegroundColor Green
Write-Host "  1. Run start_backend.bat"
Write-Host "  2. Run start_frontend.bat"
Write-Host "  3. Open http://localhost:3000"
