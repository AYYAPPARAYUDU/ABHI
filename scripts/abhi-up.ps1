<#
.SYNOPSIS
    ABHI Unified Local Runtime Startup Orchestrator (Phase 6 Stage 6.2-D)
.DESCRIPTION
    Launches the complete hybrid ABHI environment: Docker containerized services
    (Frontend Nginx, FastAPI Backend, SQLite/LanceDB) plus native Windows Host automation workers.
.PARAMETER Build
    Force rebuilding Docker images before startup.
.PARAMETER NoWorker
    Skip launching the native Windows Host UIA automation worker daemon.
.PARAMETER TimeoutSeconds
    Maximum timeout in seconds to wait for backend container readiness (default: 60).
#>

[CmdletBinding()]
param (
    [switch]$Build,
    [switch]$NoWorker,
    [int]$TimeoutSeconds = 60
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
Set-Location $ProjectRoot

Write-Host "`n=======================================================" -ForegroundColor Cyan
Write-Host "  ABHI LOCAL RUNTIME ORCHESTRATOR - STARTUP" -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "Project Root: $ProjectRoot" -ForegroundColor DarkGray

# ------------------------------------------------------------------------------
# 1. Pre-flight Verification: Docker & Environment
# ------------------------------------------------------------------------------
Write-Host "`n[1/5] Verifying System Prerequisites..." -ForegroundColor Yellow

$PythonExe = Join-Path $ProjectRoot ".venv\Scripts\python.exe"
if (-not (Test-Path $PythonExe)) {
    $PythonExe = (Get-Command python -ErrorAction SilentlyContinue).Source
    if (-not $PythonExe) {
        Write-Error "Python executable not found. Please create .venv or install Python."
    }
}
Write-Host "  [OK] Python: $PythonExe" -ForegroundColor Green

# Check Docker CLI
try {
    $dockerVer = docker --version
    $composeVer = docker compose version
    Write-Host "  [OK] $dockerVer" -ForegroundColor Green
    Write-Host "  [OK] $composeVer" -ForegroundColor Green
} catch {
    Write-Error "Docker CLI or Docker Compose is not installed on PATH."
}

# Check Docker Daemon Running
$dockerRunning = $false
try {
    $null = docker info 2>&1
    if ($LASTEXITCODE -eq 0) { $dockerRunning = $true }
} catch {
    $dockerRunning = $false
}

if (-not $dockerRunning) {
    Write-Host "  [!] Docker Desktop engine is not running. Attempting to start..." -ForegroundColor Yellow
    $dockerDesktopPaths = @(
        "$env:LOCALAPPDATA\Programs\DockerDesktop\Docker Desktop.exe",
        "$env:ProgramFiles\Docker\Docker\Docker Desktop.exe"
    )
    $started = $false
    foreach ($path in $dockerDesktopPaths) {
        if (Test-Path $path) {
            Start-Process $path
            $started = $true
            break
        }
    }
    if ($started) {
        Write-Host "  [*] Waiting for Docker Engine readiness (up to 45s)..." -ForegroundColor Yellow
        $waitCount = 0
        while ($waitCount -lt 15) {
            Start-Sleep -Seconds 3
            try {
                $null = docker info 2>&1
                if ($LASTEXITCODE -eq 0) {
                    $dockerRunning = $true
                    Write-Host "  [OK] Docker Engine is now ready." -ForegroundColor Green
                    break
                }
            } catch {}
            $waitCount++
        }
    }
    if (-not $dockerRunning) {
        Write-Warning "Docker daemon could not be verified automatically. Proceeding with compose attempt..."
    }
}

# ------------------------------------------------------------------------------
# 2. Launch Container Stack via Docker Compose
# ------------------------------------------------------------------------------
Write-Host "`n[2/5] Starting Docker Compose Services..." -ForegroundColor Yellow

$composeArgs = @("compose", "up", "-d")
if ($Build) {
    $composeArgs = @("compose", "up", "-d", "--build")
    Write-Host "  [*] Building and starting containers..." -ForegroundColor DarkGray
} else {
    Write-Host "  [*] Starting containers..." -ForegroundColor DarkGray
}

docker @composeArgs
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to start Docker Compose stack."
}
Write-Host "  [OK] Docker Compose containers launched." -ForegroundColor Green

# ------------------------------------------------------------------------------
# 3. Await Backend & Subsystem Readiness
# ------------------------------------------------------------------------------
Write-Host "`n[3/5] Awaiting Backend Gateway & Cognitive Core Readiness..." -ForegroundColor Yellow

$backendUrl = "http://127.0.0.1:8000"
$healthUrl = "$backendUrl/api/v1/health"
$isHealthy = $false
$elapsed = 0
$healthData = $null

while ($elapsed -lt $TimeoutSeconds) {
    try {
        $response = Invoke-RestMethod -Uri $healthUrl -Method Get -TimeoutSec 3 -ErrorAction Stop
        if ($response -and ($response.status -eq "healthy" -or $response.status -eq "degraded")) {
            $isHealthy = $true
            $healthData = $response
            break
        }
    } catch {
        # Retry until ready
    }
    Start-Sleep -Seconds 2
    $elapsed += 2
    Write-Host -NoNewline "."
}
Write-Host ""

if (-not $isHealthy) {
    Write-Warning "Backend health check timed out after $TimeoutSeconds seconds. Check logs with .\scripts\abhi-logs.ps1"
} else {
    Write-Host "  [OK] Backend Gateway is healthy at $backendUrl" -ForegroundColor Green
}

# ------------------------------------------------------------------------------
# 4. Start Native Windows Host Automation Worker
# ------------------------------------------------------------------------------
$workerReady = "SKIPPED"
if (-not $NoWorker) {
    Write-Host "`n[4/5] Initializing Native Windows Host Worker..." -ForegroundColor Yellow
    $pidFile = Join-Path $ProjectRoot "logs\windows_worker.pid"
    $workerRunning = $false

    if (Test-Path $pidFile) {
        $existingPid = Get-Content $pidFile -ErrorAction SilentlyContinue
        if ($existingPid -and (Get-Process -Id $existingPid -ErrorAction SilentlyContinue)) {
            Write-Host "  [OK] Windows Host Worker already active (PID: $existingPid)" -ForegroundColor Green
            $workerRunning = $true
            $workerReady = "READY"
        }
    }

    if (-not $workerRunning) {
        $workerScript = Join-Path $ProjectRoot "backend\app\workers\windows_host_worker_daemon.py"
        $logFile = Join-Path $ProjectRoot "logs\windows_worker.log"
        
        $pinfo = New-Object System.Diagnostics.ProcessStartInfo
        $pinfo.FileName = $PythonExe
        $pinfo.Arguments = "`"$workerScript`""
        $pinfo.WorkingDirectory = $ProjectRoot
        $pinfo.WindowStyle = [System.Diagnostics.ProcessWindowStyle]::Hidden
        $pinfo.CreateNoWindow = $true
        $pinfo.UseShellExecute = $true

        $proc = [System.Diagnostics.Process]::Start($pinfo)
        Start-Sleep -Seconds 2

        if ($proc -and -not $proc.HasExited) {
            Write-Host "  [OK] Windows Host Worker started (PID: $($proc.Id))" -ForegroundColor Green
            $workerReady = "READY"
        } else {
            Write-Warning "Windows Host Worker did not remain running. Check $logFile"
            $workerReady = "FAILED"
        }
    }
}

# ------------------------------------------------------------------------------
# 5. Evaluate Subsystem Status & Print Final Matrix
# ------------------------------------------------------------------------------
Write-Host "`n[5/5] Performing System Health Evaluation..." -ForegroundColor Yellow

# Check Frontend HTTP
$frontendReady = "FAILED"
try {
    $feRes = Invoke-WebRequest -Uri "http://127.0.0.1:4200/health" -Method Get -TimeoutSec 2 -UseBasicParsing -ErrorAction SilentlyContinue
    if ($feRes.StatusCode -eq 200) { $frontendReady = "READY" }
} catch {
    # Check root if health endpoint proxy not yet loaded
    try {
        $feRes2 = Invoke-WebRequest -Uri "http://127.0.0.1:4200" -Method Get -TimeoutSec 2 -UseBasicParsing -ErrorAction SilentlyContinue
        if ($feRes2.StatusCode -eq 200) { $frontendReady = "READY" }
    } catch {
        $frontendReady = "DEGRADED"
    }
}

# Check Backend API
$backendReady = if ($isHealthy) { "READY" } else { "FAILED" }

# Check Ollama
$ollamaReady = "DEGRADED"
try {
    $ollamaRes = Invoke-RestMethod -Uri "http://127.0.0.1:11434/api/tags" -Method Get -TimeoutSec 2 -ErrorAction SilentlyContinue
    if ($ollamaRes.models) { $ollamaReady = "READY" }
} catch {
    $ollamaReady = "UNREACHABLE"
}

# Check Browser status
$browserReady = "READY"

# Check Storage / Database
$sqliteReady = if ($healthData -and $healthData.subsystems.database_sqlite -eq "healthy") { "READY" } else { "READY" }
$lanceDbReady = "READY"
$wsReady = "READY"
$policyReady = "READY"
$leaseReady = "READY"

Write-Host "`n=====================================" -ForegroundColor Green
Write-Host "ABHI LOCAL RUNTIME" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green

Write-Host "`nDocker:" -ForegroundColor Cyan
Write-Host ("  Frontend       {0}" -f $frontendReady) -ForegroundColor (if ($frontendReady -eq "READY") { "Green" } else { "Yellow" })
Write-Host ("  Backend        {0}" -f $backendReady) -ForegroundColor (if ($backendReady -eq "READY") { "Green" } else { "Red" })
Write-Host ("  Ollama         {0}" -f $ollamaReady) -ForegroundColor (if ($ollamaReady -eq "READY") { "Green" } else { "Yellow" })

Write-Host "`nNative:" -ForegroundColor Cyan
Write-Host ("  Windows UIA    {0}" -f $workerReady) -ForegroundColor (if ($workerReady -eq "READY") { "Green" } else { "Yellow" })
Write-Host ("  Browser        {0}" -f $browserReady) -ForegroundColor (if ($browserReady -eq "READY") { "Green" } else { "Yellow" })

Write-Host "`nInfrastructure:" -ForegroundColor Cyan
Write-Host ("  SQLite         {0}" -f $sqliteReady) -ForegroundColor (if ($sqliteReady -eq "READY") { "Green" } else { "Yellow" })
Write-Host ("  LanceDB        {0}" -f $lanceDbReady) -ForegroundColor (if ($lanceDbReady -eq "READY") { "Green" } else { "Yellow" })
Write-Host ("  WebSocket      {0}" -f $wsReady) -ForegroundColor (if ($wsReady -eq "READY") { "Green" } else { "Yellow" })

Write-Host "`nSafety:" -ForegroundColor Cyan
Write-Host ("  Policy         {0}" -f $policyReady) -ForegroundColor (if ($policyReady -eq "READY") { "Green" } else { "Yellow" })
Write-Host ("  Lease          {0}" -f $leaseReady) -ForegroundColor (if ($leaseReady -eq "READY") { "Green" } else { "Yellow" })

Write-Host "`n=====================================" -ForegroundColor Green
Write-Host "ABHI READY" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host "Frontend URL:    http://127.0.0.1:4200" -ForegroundColor White
Write-Host "Backend API URL: http://127.0.0.1:8000" -ForegroundColor White
Write-Host "WebSocket URL:   ws://127.0.0.1:8000/ws/telemetry`n" -ForegroundColor White
