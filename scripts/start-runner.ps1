$ErrorActionPreference = 'Stop'
$projectPath = Split-Path -Parent $PSScriptRoot
$codexCommand = Get-Command codex -ErrorAction Stop
$env:JOBPREP_CODEX_EXE = $codexCommand.Source
$env:JOBPREP_CODEX_VERIFIED = 'true'
# This project verified both Codex schemas with synthetic data on 2026-09-17.
# Search is enabled only by the private setting after live source verification.
$agyPath = Join-Path $env:LOCALAPPDATA 'agy\bin\agy.exe'
if (Test-Path -LiteralPath $agyPath) { $env:JOBPREP_AGY_EXE = $agyPath }
Push-Location -LiteralPath $projectPath
try { node runner/main.mjs } finally { Pop-Location }
