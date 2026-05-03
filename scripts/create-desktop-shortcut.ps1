# Run once: powershell -ExecutionPolicy Bypass -File scripts\create-desktop-shortcut.ps1

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$exe = Join-Path $repoRoot 'src-tauri\target\release\hobbyforge-scaffold.exe'
$icon = Join-Path $repoRoot 'src-tauri\icons\icon.ico'
$shortcutPath = [Environment]::GetFolderPath('Desktop') + '\HobbyForge.lnk'

if (-not (Test-Path $exe)) {
    Write-Error "hobbyforge-scaffold.exe not found. Run 'pnpm tauri build' first."
    exit 1
}

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $exe
$shortcut.WorkingDirectory = $repoRoot
$shortcut.IconLocation = $icon
$shortcut.Description = 'HobbyForge'
$shortcut.Save()

Write-Host "Shortcut created at $shortcutPath"
