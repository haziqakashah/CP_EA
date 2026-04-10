$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$backendScript = Join-Path $repoRoot "scripts\start_backend.ps1"
$frontendScript = Join-Path $repoRoot "scripts\start_frontend.ps1"

Write-Host "Opening backend and frontend in separate PowerShell windows..." -ForegroundColor Cyan

Start-Process powershell -ArgumentList "-ExecutionPolicy", "Bypass", "-NoExit", "-File", "`"$backendScript`""
Start-Process powershell -ArgumentList "-ExecutionPolicy", "Bypass", "-NoExit", "-File", "`"$frontendScript`""

Write-Host "Both launchers have been started." -ForegroundColor Green
Write-Host "Frontend: http://localhost:3000"
Write-Host "Backend:  http://localhost:5001"
