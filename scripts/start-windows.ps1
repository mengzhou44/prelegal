$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location (Join-Path $ScriptDir "..")

Write-Host "Building PreLegal..."
docker build -t prelegal .

Write-Host "Starting PreLegal..."
docker run -d --name prelegal -p 8000:8000 --rm --env-file backend/.env prelegal

Write-Host "PreLegal is running at http://localhost:8000"
