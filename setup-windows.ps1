Param()
Set-StrictMode -Version Latest

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Error "ERROR: Python is not installed. Install Python 3.11+ from python.org."
    exit 1
}

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Error "ERROR: npm is not installed. Install Node.js 24+ from nodejs.org." 
    exit 1
}

$nodeVersion = (node -v).TrimStart('v')
$nodeMajor = [int]$nodeVersion.Split('.')[0]
if ($nodeMajor -lt 22) {
    Write-Error "ERROR: Node.js 22.13+ or 24+ is required. Found v$nodeVersion."
    exit 1
}

python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -U pip setuptools wheel
python -m pip install -r forecasting\requirements.txt

Set-Location "$root\backend"
npm install

Set-Location "$root\frontend"
Remove-Item -Recurse -Force node_modules, package-lock.json -ErrorAction SilentlyContinue
npm install

Write-Host 'Setup complete. Run the individual services from their respective folders.'