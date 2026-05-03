@echo off
cd /d "%~dp0"
echo Starting HobbyForge dev server (Ctrl+C to stop)...
pnpm tauri dev
pause
