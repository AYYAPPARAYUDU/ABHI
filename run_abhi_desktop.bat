@echo off
title ABHI - Autonomous Central Intelligence
setlocal enabledelayedexpansion

cd /d "C:\Users\AYYAPPA RAYUDU\OneDrive\Desktop\ABHI"

:: 1. Ensure Python Backend is Running on Port 8000
curl -s -m 2 http://127.0.0.1:8000/health >nul 2>&1
if %errorlevel% neq 0 (
    echo Starting ABHI Backend Server...
    start /b "" ".venv\Scripts\python.exe" run_server.py
    timeout /t 3 /nobreak >nul
)

:: 2. Ensure Angular UI is Running on Port 4200
curl -s -m 2 http://127.0.0.1:4200 >nul 2>&1
if %errorlevel% neq 0 (
    echo Starting ABHI Frontend Workspace...
    start /b "" powershell -WindowStyle Hidden -Command "npm --prefix frontend start -- --host 127.0.0.1 --port 4200"
    timeout /t 5 /nobreak >nul
)

:: 3. Locate Chrome or Edge
set "BROWSER_EXE="
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    set "BROWSER_EXE=C:\Program Files\Google\Chrome\Application\chrome.exe"
) else if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
    set "BROWSER_EXE=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
) else if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
    set "BROWSER_EXE=C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
) else if exist "C:\Program Files\Microsoft\Edge\Application\msedge.exe" (
    set "BROWSER_EXE=C:\Program Files\Microsoft\Edge\Application\msedge.exe"
)

:: 4. Launch ABHI in Native Standalone Application Window
if defined BROWSER_EXE (
    start "" "!BROWSER_EXE!" --app="http://127.0.0.1:4200" --window-size=1500,920 --app-id=abhi_central_ai
) else (
    start http://127.0.0.1:4200
)

exit /b 0
