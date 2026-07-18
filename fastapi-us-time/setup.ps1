$ErrorActionPreference = "Stop"

Set-Location $PSScriptRoot

$pythonVersion = "3.12.10"
$pythonDir = Join-Path $PSScriptRoot ".python"
$pythonExe = Join-Path $pythonDir "python.exe"
$pythonZip = Join-Path $pythonDir "python-$pythonVersion-embed-amd64.zip"
$getPip = Join-Path $pythonDir "get-pip.py"
$pythonUrl = "https://www.python.org/ftp/python/$pythonVersion/python-$pythonVersion-embed-amd64.zip"
$getPipUrl = "https://bootstrap.pypa.io/get-pip.py"

if (!(Test-Path $pythonExe)) {
    New-Item -ItemType Directory -Force $pythonDir | Out-Null

    Write-Host "Downloading portable Python $pythonVersion..."
    Invoke-WebRequest -Uri $pythonUrl -OutFile $pythonZip

    Write-Host "Extracting Python..."
    Expand-Archive -Path $pythonZip -DestinationPath $pythonDir -Force
    Remove-Item $pythonZip

    $pthFile = Join-Path $pythonDir "python312._pth"
    if (Test-Path $pthFile) {
        $pthLines = Get-Content $pthFile
        $pthLines = $pthLines -replace "^#import site$", "import site"

        if ($pthLines -notcontains "Lib\site-packages") {
            $pthLines = @($pthLines[0..($pthLines.Count - 2)]) + "Lib\site-packages" + $pthLines[-1]
        }

        Set-Content -Path $pthFile -Value $pthLines
    }
}

if (!(Test-Path $getPip)) {
    Write-Host "Downloading pip bootstrap..."
    Invoke-WebRequest -Uri $getPipUrl -OutFile $getPip
}

Write-Host "Installing pip..."
& $pythonExe $getPip

Write-Host "Installing project dependencies..."
& $pythonExe -m pip install --upgrade pip
& $pythonExe -m pip install -r requirements.txt

Write-Host ""
Write-Host "Installation complete."
Write-Host "Start the API with: .\run-dev.ps1"
