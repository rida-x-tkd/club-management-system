$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$releaseRoot = Join-Path $projectRoot 'release\RH GESTION'
$releaseBase = Join-Path $projectRoot 'release'
$sourceExe = Join-Path $projectRoot 'bin\neutralino-win_x64.exe'
$targetExe = Join-Path $releaseRoot 'RH GESTION.exe'

if (!(Test-Path -LiteralPath $sourceExe)) {
    throw "Missing Neutralino runtime: $sourceExe"
}

if (Test-Path -LiteralPath $releaseRoot) {
    $resolved = (Resolve-Path -LiteralPath $releaseRoot).Path
    if (-not $resolved.StartsWith($releaseBase)) {
        throw "Refusing to clear an unexpected path: $resolved"
    }
    Remove-Item -LiteralPath $releaseRoot -Recurse -Force
}

New-Item -ItemType Directory -Path $releaseRoot | Out-Null

Copy-Item -LiteralPath $sourceExe -Destination $targetExe -Force
Copy-Item -LiteralPath (Join-Path $projectRoot 'neutralino.config.json') -Destination (Join-Path $releaseRoot 'neutralino.config.json') -Force

foreach ($folder in @('resources', 'data', 'backups', 'receipts')) {
    $sourcePath = Join-Path $projectRoot $folder
    if (Test-Path -LiteralPath $sourcePath) {
        Copy-Item -LiteralPath $sourcePath -Destination (Join-Path $releaseRoot $folder) -Recurse -Force
    }
}

Get-ChildItem -LiteralPath $releaseRoot -Filter *.log -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue

$readmePath = Join-Path $releaseRoot 'README-RH-GESTION.txt'
@"
RH GESTION
==========

Run: RH GESTION.exe

This desktop build is self-contained and uses local folders:
- resources
- data
- backups
- receipts

Generated on: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
"@ | Set-Content -LiteralPath $readmePath -Encoding UTF8

Write-Host "Release ready at: $releaseRoot"
