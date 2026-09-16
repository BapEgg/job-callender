$ErrorActionPreference = 'Stop'
$projectPath = Split-Path -Parent $PSScriptRoot
$codexCommand = Get-Command codex -ErrorAction Stop
$env:JOBPREP_CODEX_EXE = $codexCommand.Source
$env:JOBPREP_CODEX_VERIFIED = 'true'
# This project verified both Codex schemas with synthetic data on 2026-09-17.
# Search remains disabled: the installed agy returned no validated job payload.
$env:JOBPREP_SEARCH_VERIFIED = 'false'
Push-Location -LiteralPath $projectPath
try { node runner/main.mjs } finally { Pop-Location }
