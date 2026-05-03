# Run once: powershell -ExecutionPolicy Bypass -File scripts\create-desktop-shortcut.ps1

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$target = Join-Path $repoRoot 'launch.bat'
$icon = Join-Path $repoRoot 'src-tauri\icons\icon.ico'
$shortcutPath = [Environment]::GetFolderPath('Desktop') + '\HobbyForge.lnk'

if (-not (Test-Path $target)) {
    Write-Error "launch.bat not found at $target -- run from a fully cloned repo."
    exit 1
}

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $target
$shortcut.WorkingDirectory = $repoRoot
$shortcut.IconLocation = $icon
$shortcut.Description = 'Launch HobbyForge'
$shortcut.Save()

Write-Host "Shortcut created at $shortcutPath"
