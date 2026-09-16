$ErrorActionPreference = 'Stop'

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$payloadZip = Join-Path $scriptRoot 'RH-GESTION-Payload.zip'
$installRoot = Join-Path $env:LOCALAPPDATA 'Programs\RH GESTION'
$desktopShortcutPath = Join-Path ([Environment]::GetFolderPath('Desktop')) 'RH GESTION.lnk'
$startMenuShortcutPath = Join-Path (Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs') 'RH GESTION.lnk'
$startMenuUninstallShortcutPath = Join-Path (Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs') 'Uninstall RH GESTION.lnk'
$uninstallRegistryPath = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\RH-GESTION'
$stageRoot = Join-Path $scriptRoot '.stage'
$stageDir = Join-Path $stageRoot 'app'

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

    $escaped = $InstalledExe.Replace('\', '\\')
    $running = Get-CimInstance Win32_Process -Filter "Name = 'RH GESTION.exe'" -ErrorAction SilentlyContinue |
        Where-Object { $_.ExecutablePath -eq $InstalledExe }

    foreach ($proc in $running) {
        Stop-Process -Id $proc.ProcessId -Force -ErrorAction SilentlyContinue
    }
}

function New-Shortcut {
    param(
        [string]$ShortcutPath,
        [string]$TargetPath,
        [string]$WorkingDirectory,
        [string]$IconPath,
        [string]$Description
    )

    $shortcutDir = Split-Path -Parent $ShortcutPath
    if (!(Test-Path -LiteralPath $shortcutDir)) {
        New-Item -ItemType Directory -Path $shortcutDir | Out-Null
    }

    $shell = New-Object -ComObject WScript.Shell
    $shortcut = $shell.CreateShortcut($ShortcutPath)
    $shortcut.TargetPath = $TargetPath
    $shortcut.WorkingDirectory = $WorkingDirectory
    $shortcut.IconLocation = $IconPath
    $shortcut.Description = $Description
    $shortcut.Save()
}

function Write-UninstallRegistration {
    param(
        [string]$InstallLocation,
        [string]$TargetExe,
        [string]$UninstallCmd
    )

    if (!(Test-Path -Path $uninstallRegistryPath)) {
        New-Item -Path $uninstallRegistryPath -Force | Out-Null
    }

    New-ItemProperty -Path $uninstallRegistryPath -Name 'DisplayName' -Value 'RH GESTION' -PropertyType String -Force | Out-Null
    New-ItemProperty -Path $uninstallRegistryPath -Name 'DisplayVersion' -Value '1.1.0' -PropertyType String -Force | Out-Null
    New-ItemProperty -Path $uninstallRegistryPath -Name 'Publisher' -Value 'RH GESTION' -PropertyType String -Force | Out-Null
    New-ItemProperty -Path $uninstallRegistryPath -Name 'InstallLocation' -Value $InstallLocation -PropertyType String -Force | Out-Null
    New-ItemProperty -Path $uninstallRegistryPath -Name 'DisplayIcon' -Value $TargetExe -PropertyType String -Force | Out-Null
    New-ItemProperty -Path $uninstallRegistryPath -Name 'UninstallString' -Value "`"$UninstallCmd`"" -PropertyType String -Force | Out-Null
    New-ItemProperty -Path $uninstallRegistryPath -Name 'QuietUninstallString' -Value "`"$UninstallCmd`"" -PropertyType String -Force | Out-Null
    New-ItemProperty -Path $uninstallRegistryPath -Name 'NoModify' -Value 1 -PropertyType DWord -Force | Out-Null
    New-ItemProperty -Path $uninstallRegistryPath -Name 'NoRepair' -Value 1 -PropertyType DWord -Force | Out-Null
}

if (!(Test-Path -LiteralPath $payloadZip)) {
    throw "Missing payload archive: $payloadZip"
}

if (Test-Path -LiteralPath $stageRoot) {
    Remove-Safely -PathToRemove $stageRoot -GuardRoot $scriptRoot
}

New-Item -ItemType Directory -Path $stageDir -Force | Out-Null
Expand-Archive -LiteralPath $payloadZip -DestinationPath $stageDir -Force

$installedExe = Join-Path $installRoot 'RH GESTION.exe'
Stop-InstalledProcess -InstalledExe $installedExe

if (Test-Path -LiteralPath $installRoot) {
    Remove-Safely -PathToRemove $installRoot -GuardRoot (Join-Path $env:LOCALAPPDATA 'Programs')
}

New-Item -ItemType Directory -Path $installRoot -Force | Out-Null
Copy-Item -Path (Join-Path $stageDir '*') -Destination $installRoot -Recurse -Force
Copy-Item -LiteralPath (Join-Path $scriptRoot 'uninstall-rh-gestion.ps1') -Destination (Join-Path $installRoot 'uninstall-rh-gestion.ps1') -Force
Copy-Item -LiteralPath (Join-Path $scriptRoot 'uninstall-rh-gestion.cmd') -Destination (Join-Path $installRoot 'uninstall-rh-gestion.cmd') -Force

$targetExe = Join-Path $installRoot 'RH GESTION.exe'
$iconPath = Join-Path $installRoot 'resources\icons\rh-gestion.ico'
$uninstallCmd = Join-Path $installRoot 'uninstall-rh-gestion.cmd'

New-Shortcut -ShortcutPath $desktopShortcutPath -TargetPath $targetExe -WorkingDirectory $installRoot -IconPath $iconPath -Description 'RH GESTION'
New-Shortcut -ShortcutPath $startMenuShortcutPath -TargetPath $targetExe -WorkingDirectory $installRoot -IconPath $iconPath -Description 'RH GESTION'
New-Shortcut -ShortcutPath $startMenuUninstallShortcutPath -TargetPath $uninstallCmd -WorkingDirectory $installRoot -IconPath $iconPath -Description 'Uninstall RH GESTION'
Write-UninstallRegistration -InstallLocation $installRoot -TargetExe $targetExe -UninstallCmd $uninstallCmd

Remove-Safely -PathToRemove $stageRoot -GuardRoot $scriptRoot

Start-Process -FilePath $targetExe -WorkingDirectory $installRoot
