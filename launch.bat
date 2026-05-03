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

where pnpm >nul 2>&1
if errorlevel 1 (
    echo ERROR: pnpm not found. Install it from https://pnpm.io or run launch-dev.bat instead.
    pause
    endlocal
    exit /b 1
)

cd /d "%~dp0"
pnpm tauri build

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
