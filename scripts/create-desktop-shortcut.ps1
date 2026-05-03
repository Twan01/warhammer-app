# Run once: powershell -ExecutionPolicy Bypass -File scripts\create-desktop-shortcut.ps1

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$devBat = Join-Path $repoRoot 'launch-dev.bat'
$icon = Join-Path $repoRoot 'src-tauri\icons\icon.ico'
$shortcutPath = [Environment]::GetFolderPath('Desktop') + '\HobbyForge.lnk'

if (-not (Test-Path $devBat)) {
    Write-Error "launch-dev.bat not found at $devBat -- run from a fully cloned repo."
    exit 1
}

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = 'cmd.exe'
$shortcut.Arguments = "/k `"$devBat`""
$shortcut.WorkingDirectory = $repoRoot
$shortcut.IconLocation = $icon
$shortcut.Description = 'Launch HobbyForge (dev mode)'
$shortcut.Save()

Write-Host "Shortcut created at $shortcutPath"
