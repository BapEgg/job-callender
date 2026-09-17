# Default is a read-only preview. Use -Install only after user approval.
param([switch]$Install)
$ErrorActionPreference = 'Stop'
$taskName = 'JobCallender-Runner'
$projectPath = Split-Path -Parent $PSScriptRoot
$startScript = Join-Path $PSScriptRoot 'start-runner.ps1'
$shellPath = (Get-Process -Id $PID).Path
$nodePath = (Get-Command node -ErrorAction Stop).Source
$codexPath = (Get-Command codex -ErrorAction Stop).Source
foreach ($filePath in @($shellPath, $nodePath, $codexPath, $startScript)) {
    if (-not (Test-Path -LiteralPath $filePath -PathType Leaf) -or $filePath.Contains('"')) { throw 'Invalid executable or script path.' }
}
$arguments = '-NoProfile -NonInteractive -WindowStyle Hidden -File "{0}" -NodePath "{1}" -CodexPath "{2}"' -f $startScript, $nodePath, $codexPath
$currentUser = [Security.Principal.WindowsIdentity]::GetCurrent().Name
$action = New-ScheduledTaskAction -Execute $shellPath -Argument $arguments -WorkingDirectory $projectPath
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $currentUser
$principal = New-ScheduledTaskPrincipal -UserId $currentUser -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
$definition = New-ScheduledTask -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description 'Job-callender local runner at user sign-in. No stored password, no administrator privileges.'
if ($Install) {
    if (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue) { throw 'Task already exists. Review it before changing anything.' }
    Register-ScheduledTask -TaskName $taskName -InputObject $definition -ErrorAction Stop | Select-Object TaskName, State
} else {
    [pscustomobject]@{Mode='Preview only';TaskName=$taskName;Trigger='Current user sign-in';RunLevel='Limited';PasswordStored=$false;Execute=$shellPath;Arguments=$arguments;WorkingDirectory=$projectPath;MultipleInstances='IgnoreNew';RestartCount=3;WakeComputer=$false} | ConvertTo-Json
}
