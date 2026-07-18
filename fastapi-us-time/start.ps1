$ErrorActionPreference = "Stop"

Set-Location $PSScriptRoot

$localPython = Join-Path $PSScriptRoot ".python\python.exe"

if (Test-Path $localPython) {
    Write-Host "Starting FastAPI with local portable Python..."
    & $localPython -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
    exit $LASTEXITCODE
}

$globalPython = Get-Command python -ErrorAction SilentlyContinue

if ($globalPython) {
    Write-Host "Starting FastAPI with global Python..."
    & python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
    exit $LASTEXITCODE
}

Write-Host ""
Write-Host "Python was not found."
Write-Host "Run this once, then start again:"
Write-Host "  powershell -ExecutionPolicy Bypass -File .\setup.ps1"
Write-Host ""
exit 1
