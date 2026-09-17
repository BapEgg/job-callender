$ErrorActionPreference = 'Stop'
$projectPath = Split-Path -Parent $PSScriptRoot
$shellPath = (Get-Process -Id $PID).Path
$nodePath = (Get-Command node -ErrorAction Stop).Source
$codexPath = (Get-Command codex -ErrorAction Stop).Source
$hasher = [Security.Cryptography.SHA256]::Create()
try { $suffix = [BitConverter]::ToString($hasher.ComputeHash([Text.Encoding]::UTF8.GetBytes($projectPath.ToLowerInvariant()))).Replace('-', '') }
finally { $hasher.Dispose() }
$mutex = [Threading.Mutex]::new($false, ('Local\JobCallenderRunner-' + $suffix))
$owned = $false
try {
    $owned = $mutex.WaitOne(0)
    if (-not $owned) { throw 'Another runner owns the lock; skip this test without launching any child.' }
    $output = & $shellPath -NoProfile -NonInteractive -File (Join-Path $PSScriptRoot 'start-runner.ps1') -NodePath $nodePath -CodexPath $codexPath
    if ($LASTEXITCODE -ne 0 -or "$output" -notmatch 'already active') { throw 'Duplicate runner prevention failed.' }
    Write-Output 'PASS: installed PowerShell startup script prevents duplicate runner; no Node/AI process started.'
} finally {
    if ($owned) { $mutex.ReleaseMutex() }
    $mutex.Dispose()
}
