@echo off
setlocal
cd /d "%~dp0"
if exist "C:\Python314\pythonw.exe" (
    start "" "C:\Python314\pythonw.exe" "abhi_global_controller.py"
) else if exist ".venv\Scripts\pythonw.exe" (
    start "" ".venv\Scripts\pythonw.exe" "abhi_global_controller.py"
) else (
    start "" python "abhi_global_controller.py"
)
exit /b 0
