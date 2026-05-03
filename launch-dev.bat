@echo off
cd /d "%~dp0"

:: pnpm may not be on PATH when launched from File Explorer -- try common locations
set "PNPM_CMD=pnpm"
where pnpm >nul 2>&1
if errorlevel 1 (
    if exist "%APPDATA%\npm\pnpm.cmd" set "PNPM_CMD=%APPDATA%\npm\pnpm.cmd"
    if exist "%LOCALAPPDATA%\pnpm\pnpm.cmd" set "PNPM_CMD=%LOCALAPPDATA%\pnpm\pnpm.cmd"
)

echo Starting HobbyForge dev server (Ctrl+C to stop)...
"%PNPM_CMD%" tauri dev
pause
