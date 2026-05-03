@echo off
cd /d "%~dp0"

:: pnpm may not be on PATH when launched from File Explorer -- try common locations
set "PNPM_CMD=pnpm"
where pnpm >nul 2>&1
if errorlevel 1 (
    if exist "%APPDATA%\npm\pnpm.cmd" set "PNPM_CMD=%APPDATA%\npm\pnpm.cmd"
    if exist "%LOCALAPPDATA%\pnpm\pnpm.cmd" set "PNPM_CMD=%LOCALAPPDATA%\pnpm\pnpm.cmd"
)

echo ============================================
echo  HobbyForge Dev Launcher
echo ============================================
echo.
echo Starting... this takes about 30-60 seconds
echo for the first compile. Window stays open.
echo Press Ctrl+C to stop the app.
echo.
"%PNPM_CMD%" tauri dev
echo.
echo Dev server stopped.
pause
