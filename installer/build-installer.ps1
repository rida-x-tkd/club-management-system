$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$installerRoot = Join-Path $projectRoot 'installer'
$buildRoot = Join-Path $installerRoot 'build'
$stagingRoot = Join-Path $buildRoot 'staging'
$packageRoot = Join-Path $stagingRoot 'package'
$payloadZip = Join-Path $packageRoot 'RH-GESTION-Payload.zip'
$sedPath = Join-Path $buildRoot 'RH-GESTION-installer.sed'
$targetInstaller = Join-Path $projectRoot 'release\RH-GESTION-Installer.exe'
$releaseRoot = Join-Path $projectRoot 'release\RH GESTION'

& (Join-Path $projectRoot 'build-release.ps1')

if (Test-Path -LiteralPath $buildRoot) {
    Remove-Item -LiteralPath $buildRoot -Recurse -Force
}

New-Item -ItemType Directory -Path $packageRoot -Force | Out-Null

Compress-Archive -Path (Join-Path $releaseRoot '*') -DestinationPath $payloadZip -CompressionLevel Optimal -Force
Copy-Item -LiteralPath (Join-Path $installerRoot 'install-rh-gestion.ps1') -Destination (Join-Path $packageRoot 'install-rh-gestion.ps1') -Force
Copy-Item -LiteralPath (Join-Path $installerRoot 'install-rh-gestion.cmd') -Destination (Join-Path $packageRoot 'install-rh-gestion.cmd') -Force
Copy-Item -LiteralPath (Join-Path $installerRoot 'uninstall-rh-gestion.ps1') -Destination (Join-Path $packageRoot 'uninstall-rh-gestion.ps1') -Force
Copy-Item -LiteralPath (Join-Path $installerRoot 'uninstall-rh-gestion.cmd') -Destination (Join-Path $packageRoot 'uninstall-rh-gestion.cmd') -Force

$sourceDir = $packageRoot
if (-not $sourceDir.EndsWith('\')) {
    $sourceDir += '\'
}

$sed = @"
[Version]
Class=IEXPRESS
SEDVersion=3
[Options]
PackagePurpose=InstallApp
ShowInstallProgramWindow=1
HideExtractAnimation=1
UseLongFileName=1
InsideCompressed=0
CAB_FixedSize=0
CAB_ResvCodeSigning=0
RebootMode=N
InstallPrompt=
DisplayLicense=
FinishMessage=RH GESTION was installed successfully.
TargetName=$targetInstaller
FriendlyName=RH GESTION Installer
AppLaunched=install-rh-gestion.cmd
PostInstallCmd=<None>
AdminQuietInstCmd=install-rh-gestion.cmd
UserQuietInstCmd=install-rh-gestion.cmd
SourceFiles=SourceFiles
[Strings]
FILE0="install-rh-gestion.cmd"
FILE1="install-rh-gestion.ps1"
FILE2="RH-GESTION-Payload.zip"
FILE3="uninstall-rh-gestion.cmd"
FILE4="uninstall-rh-gestion.ps1"
[SourceFiles]
SourceFiles0=$sourceDir
[SourceFiles0]
%FILE0%=
%FILE1%=
%FILE2%=
%FILE3%=
%FILE4%=
"@

$sed | Set-Content -LiteralPath $sedPath -Encoding ASCII

if (Test-Path -LiteralPath $targetInstaller) {
    Remove-Item -LiteralPath $targetInstaller -Force
}

& iexpress.exe /N $sedPath | Out-Null

if (!(Test-Path -LiteralPath $targetInstaller)) {
    throw "IExpress did not produce the installer: $targetInstaller"
}

if (Test-Path -LiteralPath $buildRoot) {
    Remove-Item -LiteralPath $buildRoot -Recurse -Force
}

Write-Host "Installer ready at: $targetInstaller"
