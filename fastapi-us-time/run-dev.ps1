$ErrorActionPreference = "Stop"

Set-Location $PSScriptRoot

$localPython = Join-Path $PSScriptRoot ".python\python.exe"

if (Test-Path $localPython) {
    & $localPython -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
} else {
    python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
}
