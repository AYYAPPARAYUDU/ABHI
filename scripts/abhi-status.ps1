<#
.SYNOPSIS
    ABHI Subsystem Status & Health Dashboard (Phase 6 Stage 6.2-D)
.DESCRIPTION
    Inspects Docker container status, Backend REST Health endpoints, Ollama LLM readiness,
    and Native Windows UIA host worker diagnostics.
#>

[CmdletBinding()]
param ()

$ErrorActionPreference = "Continue"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
Set-Location $ProjectRoot

Write-Host "`n=======================================================" -ForegroundColor Cyan
Write-Host "  ABHI RUNTIME STATUS & HEALTH DASHBOARD" -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan

# ------------------------------------------------------------------------------
# 1. Docker Compose Container Status
# ------------------------------------------------------------------------------
Write-Host "`n[1] Container Services (Docker Compose):" -ForegroundColor Yellow
try {
    docker compose ps
} catch {
    Write-Host "  Docker Compose not reachable or daemon inactive." -ForegroundColor Red
}

# ------------------------------------------------------------------------------
# 2. Backend Health Subsystems API Check
# ------------------------------------------------------------------------------
Write-Host "`n[2] Backend Cognitive Core Subsystems:" -ForegroundColor Yellow
$backendUrl = "http://127.0.0.1:8000/api/v1/health"
$healthData = $null
try {
    $healthData = Invoke-RestMethod -Uri $backendUrl -Method Get -TimeoutSec 3 -ErrorAction Stop
    Write-Host ("  Status:           {0}" -f $healthData.status.ToUpper()) -ForegroundColor (if ($healthData.status -eq "healthy") { "Green" } else { "Yellow" })
    Write-Host ("  Environment:      {0}" -f $healthData.environment) -ForegroundColor DarkGray
    Write-Host ("  API Gateway:      {0}" -f $healthData.subsystems.api_gateway) -ForegroundColor Green
    Write-Host ("  SQLite DB:        {0}" -f $healthData.subsystems.database_sqlite) -ForegroundColor (if ($healthData.subsystems.database_sqlite -eq "healthy") { "Green" } else { "Yellow" })
    Write-Host ("  Ollama Bridge:    {0}" -f $healthData.subsystems.ollama_service) -ForegroundColor (if ($healthData.subsystems.ollama_service -eq "healthy") { "Green" } else { "Yellow" })
    if ($healthData.subsystems.storage) {
        Write-Host ("  Storage Headroom: {0} GB Free ({1})" -f $healthData.subsystems.storage.free_gb, $healthData.subsystems.storage.status) -ForegroundColor DarkGray
    }
} catch {
    Write-Host "  Backend API unreachable at $backendUrl" -ForegroundColor Red
}

# ------------------------------------------------------------------------------
# 3. Ollama Local LLM Engine Status
# ------------------------------------------------------------------------------
Write-Host "`n[3] Ollama Local LLM Engine:" -ForegroundColor Yellow
try {
    $ollamaData = Invoke-RestMethod -Uri "http://127.0.0.1:11434/api/tags" -Method Get -TimeoutSec 3 -ErrorAction Stop
    $modelNames = ($ollamaData.models | ForEach-Object { $_.name }) -join ", "
    Write-Host "  Ollama Engine:    ONLINE (http://127.0.0.1:11434)" -ForegroundColor Green
    Write-Host "  Available Models: $modelNames" -ForegroundColor Green
} catch {
    Write-Host "  Ollama Engine:    OFFLINE or UNREACHABLE" -ForegroundColor Yellow
}

# ------------------------------------------------------------------------------
# 4. Frontend Web Gateway Status
# ------------------------------------------------------------------------------
Write-Host "`n[4] Frontend Angular Operator Console:" -ForegroundColor Yellow
try {
    $feRes = Invoke-WebRequest -Uri "http://127.0.0.1:4200/health" -Method Get -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
    Write-Host "  Frontend Gateway: ONLINE (http://127.0.0.1:4200)" -ForegroundColor Green
} catch {
    try {
        $feRes2 = Invoke-WebRequest -Uri "http://127.0.0.1:4200" -Method Get -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
        Write-Host "  Frontend Gateway: ONLINE (http://127.0.0.1:4200)" -ForegroundColor Green
    } catch {
        Write-Host "  Frontend Gateway: OFFLINE (http://127.0.0.1:4200)" -ForegroundColor Red
    }
}

# ------------------------------------------------------------------------------
# 5. Native Windows UIA Automation Worker Status
# ------------------------------------------------------------------------------
Write-Host "`n[5] Native Windows Host Automation Worker:" -ForegroundColor Yellow
$pidFile = Join-Path $ProjectRoot "logs\windows_worker.pid"
if (Test-Path $pidFile) {
    $workerPid = Get-Content $pidFile -ErrorAction SilentlyContinue
    if ($workerPid) {
        $proc = Get-Process -Id $workerPid -ErrorAction SilentlyContinue
        if ($proc) {
            Write-Host ("  Worker Process:   ACTIVE (PID: {0}, CPU: {1}s, WorkingSet: {2} MB)" -f $proc.Id, [Math]::Round($proc.TotalProcessorTime.TotalSeconds, 1), [Math]::Round($proc.WorkingSet64 / 1MB, 1)) -ForegroundColor Green
        } else {
            Write-Host "  Worker Process:   STALE PID FILE (Process not found)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  Worker Process:   INACTIVE (No PID file)" -ForegroundColor Yellow
    }
} else {
    Write-Host "  Worker Process:   INACTIVE" -ForegroundColor Yellow
}

Write-Host "`n=======================================================`n" -ForegroundColor Cyan
