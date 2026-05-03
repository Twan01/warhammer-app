@echo off
setlocal

set "EXE=%~dp0src-tauri\target\release\hobbyforge-scaffold.exe"

if exist "%EXE%" (
    start "" "%EXE%"
    endlocal
    exit /b 0
)

echo HobbyForge isn't built yet -- building now, this takes a few minutes...
echo.

echo NOTE: The app hasn't been built yet. Building now (this takes several minutes)...
echo.

:: pnpm may not be on PATH when launched from File Explorer -- try common locations
set "PNPM_CMD=pnpm"
where pnpm >nul 2>&1
if errorlevel 1 (
    if exist "%APPDATA%\npm\pnpm.cmd" set "PNPM_CMD=%APPDATA%\npm\pnpm.cmd"
    if exist "%LOCALAPPDATA%\pnpm\pnpm.cmd" set "PNPM_CMD=%LOCALAPPDATA%\pnpm\pnpm.cmd"
)

"%PNPM_CMD%" --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: pnpm not found. Please run launch-dev.bat from a terminal instead,
    echo or open a terminal in this folder and run: pnpm tauri build
    pause
    endlocal
    exit /b 1
)

cd /d "%~dp0"
"%PNPM_CMD%" tauri build

if exist "%EXE%" (
    start "" "%EXE%"
    endlocal
    exit /b 0
) else (
    echo ERROR: Build completed but executable not found at expected path.
    echo Expected: %EXE%
    pause
    endlocal
    exit /b 1
)
