$ErrorActionPreference = "Stop"

Set-Location $PSScriptRoot

$localPython = Join-Path $PSScriptRoot ".python\python.exe"

if (Test-Path $localPython) {
    & $localPython -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
} else {
    python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
}
