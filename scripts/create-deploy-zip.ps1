# Zip dist dengan path forward-slash (kompatibel Netlify/Linux)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$root = Split-Path -Parent $PSScriptRoot
$dist = Join-Path $root 'dist'
$deployDir = Join-Path $env:USERPROFILE 'Downloads'
$outZip = Join-Path $deployDir 'SMP-TAMHAR-portal-deploy.zip'

if (-not (Test-Path $dist)) { throw "Folder dist tidak ada. Jalankan: npm run build" }
if (Test-Path $outZip) { Remove-Item $outZip -Force }

$zip = [System.IO.Compression.ZipFile]::Open($outZip, [System.IO.Compression.ZipArchiveMode]::Create)
try {
    Get-ChildItem -Path $dist -Recurse -File | ForEach-Object {
        $relative = $_.FullName.Substring($dist.Length + 1).Replace('\', '/')
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $_.FullName, $relative) | Out-Null
        Write-Host "  + $relative"
    }
} finally {
    $zip.Dispose()
}

$destinations = @(
    [Environment]::GetFolderPath('Desktop')
)

foreach ($dest in $destinations) {
    $target = Join-Path $dest 'SMP-TAMHAR-portal-deploy.zip'
    if ((Resolve-Path $outZip).Path -eq (Resolve-Path $target -ErrorAction SilentlyContinue).Path) { continue }
    Copy-Item $outZip $target -Force
}

Write-Host ""
Write-Host "ZIP siap: $outZip ($((Get-Item $outZip).Length) bytes)" -ForegroundColor Green
Write-Host "Disalin ke Desktop. File utama ada di Downloads." -ForegroundColor Green