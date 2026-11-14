@echo off
:: ABHI Startup Launcher - Runs silently in background on Windows Boot
cd /d "C:\Users\AYYAPPA RAYUDU\OneDrive\Desktop\ABHI"

:: 1. Start Python Backend if not running
curl -s -m 2 http://127.0.0.1:8000/health >nul 2>&1
if %errorlevel% neq 0 (
    start "" "C:\Python314\pythonw.exe" run_server.py
)

:: 2. Start Global OS Controller with Voice Listener (pythonw runs completely hidden without console window)
start "" "C:\Python314\pythonw.exe" abhi_global_controller.py

exit /b 0
