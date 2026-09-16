$ErrorActionPreference = 'Stop'

$installRoot = Join-Path $env:LOCALAPPDATA 'Programs\RH GESTION'
$desktopShortcutPath = Join-Path ([Environment]::GetFolderPath('Desktop')) 'RH GESTION.lnk'
$startMenuPrograms = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs'
$startMenuShortcutPath = Join-Path $startMenuPrograms 'RH GESTION.lnk'
$startMenuUninstallShortcutPath = Join-Path $startMenuPrograms 'Uninstall RH GESTION.lnk'
$uninstallRegistryPath = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\RH-GESTION'

function Remove-Safely {
    param([string]$PathToRemove, [string]$GuardRoot)

    if (!(Test-Path -LiteralPath $PathToRemove)) {
        return
    }

    $resolvedTarget = (Resolve-Path -LiteralPath $PathToRemove).Path
    $resolvedGuard = [System.IO.Path]::GetFullPath($GuardRoot)

    if (-not $resolvedTarget.StartsWith($resolvedGuard, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Unsafe delete target: $resolvedTarget"
    }

    Remove-Item -LiteralPath $resolvedTarget -Recurse -Force
}

function Stop-InstalledProcess {
    param([string]$InstalledExe)

    if (!(Test-Path -LiteralPath $InstalledExe)) {
        return
    }

    $running = Get-CimInstance Win32_Process -Filter "Name = 'RH GESTION.exe'" -ErrorAction SilentlyContinue |
        Where-Object { $_.ExecutablePath -eq $InstalledExe }

    foreach ($proc in $running) {
        Stop-Process -Id $proc.ProcessId -Force -ErrorAction SilentlyContinue
    }
}

function Remove-ShortcutIfExists {
    param([string]$ShortcutPath)

    if (Test-Path -LiteralPath $ShortcutPath) {
        Remove-Item -LiteralPath $ShortcutPath -Force -ErrorAction SilentlyContinue
    }
}

$installedExe = Join-Path $installRoot 'RH GESTION.exe'
Stop-InstalledProcess -InstalledExe $installedExe

Remove-ShortcutIfExists -ShortcutPath $desktopShortcutPath
Remove-ShortcutIfExists -ShortcutPath $startMenuShortcutPath
Remove-ShortcutIfExists -ShortcutPath $startMenuUninstallShortcutPath

if (Test-Path -Path $uninstallRegistryPath) {
    Remove-Item -Path $uninstallRegistryPath -Recurse -Force -ErrorAction SilentlyContinue
}

if (!(Test-Path -LiteralPath $installRoot)) {
    exit 0
}

$cleanupScript = Join-Path $env:TEMP ("RH-GESTION-Cleanup-" + [Guid]::NewGuid().ToString('N') + '.cmd')
$cleanupBody = @"
@echo off
set "TARGET=$installRoot"
:retry
if exist "%TARGET%\RH GESTION.exe" (
  >nul 2>&1 taskkill /F /IM "RH GESTION.exe"
)
rmdir /S /Q "%TARGET%" >nul 2>&1
if exist "%TARGET%" (
  ping 127.0.0.1 -n 3 >nul
  goto retry
)
del "%~f0" >nul 2>&1
"@

$cleanupBody | Set-Content -LiteralPath $cleanupScript -Encoding ASCII
Start-Process -FilePath 'cmd.exe' -ArgumentList "/c `"$cleanupScript`"" -WindowStyle Hidden
