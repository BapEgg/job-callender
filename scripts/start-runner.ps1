param([string]$NodePath, [string]$CodexPath)
$ErrorActionPreference = 'Stop'
$projectPath = Split-Path -Parent $PSScriptRoot
if (-not $NodePath) { $NodePath = (Get-Command node -ErrorAction Stop).Source }
if (-not $CodexPath) { $CodexPath = (Get-Command codex -ErrorAction Stop).Source }
if (-not (Test-Path -LiteralPath $NodePath -PathType Leaf) -or -not (Test-Path -LiteralPath $CodexPath -PathType Leaf)) {
    throw 'Configured Node or Codex executable is unavailable. Recheck the startup registration.'
}
$env:JOBPREP_CODEX_EXE = $CodexPath
$env:JOBPREP_CODEX_VERIFIED = 'true'
# This project verified both Codex schemas with synthetic data on 2026-09-17.
# Search is enabled only by the private setting after live source verification.
$agyPath = Join-Path $env:LOCALAPPDATA 'agy\bin\agy.exe'
if (Test-Path -LiteralPath $agyPath) { $env:JOBPREP_AGY_EXE = $agyPath }
$pathHash = [System.Security.Cryptography.SHA256]::Create()
try { $mutexSuffix = [BitConverter]::ToString($pathHash.ComputeHash([Text.Encoding]::UTF8.GetBytes($projectPath.ToLowerInvariant()))).Replace('-', '') }
finally { $pathHash.Dispose() }
$runnerMutex = [Threading.Mutex]::new($false, ('Local\JobCallenderRunner-' + $mutexSuffix))
$ownsMutex = $false
try {
    try { $ownsMutex = $runnerMutex.WaitOne(0) } catch [Threading.AbandonedMutexException] { $ownsMutex = $true }
    if (-not $ownsMutex) { Write-Output 'The project runner is already active.'; return }
    Push-Location -LiteralPath $projectPath
    try { & $NodePath runner/main.mjs; if ($LASTEXITCODE -ne 0) { throw 'Runner exited with an error.' } }
    finally { Pop-Location }
} finally {
    if ($ownsMutex) { $runnerMutex.ReleaseMutex() }
    $runnerMutex.Dispose()
}
