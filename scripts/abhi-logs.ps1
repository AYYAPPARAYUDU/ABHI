<#
.SYNOPSIS
    ABHI Unified Logging Stream & Diagnostics Utility (Phase 6 Stage 6.2-D)
.DESCRIPTION
    Provides log streaming and history for containerized services (backend, frontend, ollama)
    and native Windows host workers.
.PARAMETER Service
    Service name to view: "backend", "frontend", "ollama", "worker", or "all" (default).
.PARAMETER Follow
    Follow log output in real-time (-f).
.PARAMETER Lines
    Number of tail log lines to display (default: 50).
#>

[CmdletBinding()]
param (
    [ValidateSet("all", "backend", "frontend", "ollama", "worker")]
    [string]$Service = "all",

    [Alias("f")]
    [switch]$Follow,

    [int]$Lines = 50
)

$ErrorActionPreference = "Continue"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
Set-Location $ProjectRoot

if ($Service -eq "worker") {
    $workerLog = Join-Path $ProjectRoot "logs\windows_worker.log"
    if (Test-Path $workerLog) {
        Write-Host "Streaming Native Windows Host Worker Log ($workerLog)..." -ForegroundColor Cyan
        if ($Follow) {
            Get-Content $workerLog -Tail $Lines -Wait
        } else {
            Get-Content $workerLog -Tail $Lines
        }
    } else {
        Write-Warning "Host worker log file not found at $workerLog"
    }
} else {
    $composeArgs = @("compose", "logs", "--tail=$Lines")
    if ($Follow) {
        $composeArgs += "-f"
    }
    if ($Service -ne "all") {
        $composeArgs += $Service
    }
    Write-Host "Streaming Docker Compose logs (Service: $Service)..." -ForegroundColor Cyan
    docker @composeArgs
}
