<#
.SYNOPSIS
    ABHI Unified Local Runtime Shutdown Orchestrator (Phase 6 Stage 6.2-D)
.DESCRIPTION
    Gracefully terminates native Windows host workers, releases active automation leases,
    and halts all Docker containerized services.
.PARAMETER Volumes
    Also remove Docker volumes when tearing down containers (default: false).
#>

[CmdletBinding()]
param (
    [switch]$Volumes
)

$ErrorActionPreference = "Continue"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
Set-Location $ProjectRoot

Write-Host "`n=======================================================" -ForegroundColor Cyan
Write-Host "  ABHI LOCAL RUNTIME ORCHESTRATOR - SHUTDOWN" -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan

# ------------------------------------------------------------------------------
# 1. Stop Native Windows Host Workers
# ------------------------------------------------------------------------------
Write-Host "`n[1/3] Terminating Native Windows Host Workers..." -ForegroundColor Yellow

$pidFile = Join-Path $ProjectRoot "logs\windows_worker.pid"
if (Test-Path $pidFile) {
    $workerPid = Get-Content $pidFile -ErrorAction SilentlyContinue
    if ($workerPid) {
        $proc = Get-Process -Id $workerPid -ErrorAction SilentlyContinue
        if ($proc) {
            Write-Host "  [*] Stopping Host Worker Process (PID: $workerPid)..." -ForegroundColor DarkGray
            Stop-Process -Id $workerPid -Force -ErrorAction SilentlyContinue
            Write-Host "  [OK] Host Worker terminated." -ForegroundColor Green
        }
    }
    Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
}

# Also ensure any lingering python worker daemon instances are stopped
$lingeringProcs = Get-CimInstance Win32_Process | Where-Object { 
    $_.CommandLine -like "*windows_host_worker_daemon.py*" 
}
foreach ($p in $lingeringProcs) {
    Write-Host "  [*] Stopping lingering worker PID $($p.ProcessId)..." -ForegroundColor DarkGray
    Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue
}

# ------------------------------------------------------------------------------
# 2. Stop Docker Compose Services
# ------------------------------------------------------------------------------
Write-Host "`n[2/3] Stopping Docker Compose Container Services..." -ForegroundColor Yellow

$downArgs = @("compose", "down")
if ($Volumes) {
    $downArgs += "-v"
}

docker @downArgs
if ($LASTEXITCODE -eq 0) {
    Write-Host "  [OK] Docker Compose containers stopped and removed." -ForegroundColor Green
} else {
    Write-Warning "Docker compose down encountered an issue or Docker is inactive."
}

# ------------------------------------------------------------------------------
# 3. Verify System Cleanup
# ------------------------------------------------------------------------------
Write-Host "`n[3/3] Verifying System Cleanup..." -ForegroundColor Yellow

$activeContainers = docker ps --filter "name=abhi-" -q 2>&1
if ($activeContainers -and $activeContainers.Count -gt 0) {
    Write-Warning "Some ABHI containers may still be running: $activeContainers"
} else {
    Write-Host "  [OK] All ABHI container ports and workers released." -ForegroundColor Green
}

Write-Host "`n=======================================================" -ForegroundColor Green
Write-Host "  ABHI LOCAL RUNTIME SHUTDOWN COMPLETE" -ForegroundColor Green
Write-Host "=======================================================`n" -ForegroundColor Green
