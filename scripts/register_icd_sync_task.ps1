$ErrorActionPreference = "Stop"

$projectRoot = "C:\app\emergency_web"
$pythonExe = "C:\Python313\python.exe"
$scriptPath = Join-Path $projectRoot "scripts\sync_icd10cm_to_mysql.py"
$taskName = "EmergencyWeb-ICD-Sync-3AM"

if (-not (Test-Path $pythonExe)) {
    throw "找不到 Python: $pythonExe"
}

if (-not (Test-Path $scriptPath)) {
    throw "找不到同步腳本: $scriptPath"
}

$action = New-ScheduledTaskAction `
    -Execute $pythonExe `
    -Argument "`"$scriptPath`"" `
    -WorkingDirectory $projectRoot

$trigger = New-ScheduledTaskTrigger -Daily -At 3:00AM

Register-ScheduledTask `
    -TaskName $taskName `
    -Action $action `
    -Trigger $trigger `
    -Description "每日凌晨 3:00 同步 DB2 ICD10CM 到 MySQL ICD" `
    -RunLevel Highest `
    -Force | Out-Null

Write-Host "已建立/更新排程工作: $taskName"
