# Setup GEMINI_API_KEY untuk SMP-TAMHAR (lokal)
# Usage: powershell -ExecutionPolicy Bypass -File scripts\configure-gemini.ps1

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path $PSScriptRoot -Parent
$envFile = Join-Path $projectRoot ".env.local"

Write-Host ""
Write-Host "=== Setup Gemini API Key - SMP-TAMHAR ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Dapatkan key di: https://aistudio.google.com/apikey" -ForegroundColor Gray
Write-Host '(Atau copy dari AI Studio: Settings - Secrets - GEMINI_API_KEY)' -ForegroundColor Gray
Write-Host ""
Write-Host "PENTING: Jangan kirim API key ke chat AI. Hanya ketik di terminal ini." -ForegroundColor Yellow
Write-Host ""

$open = Read-Host "Buka halaman API key di browser sekarang? [Y/n]"
if ($open -ne "n" -and $open -ne "N") {
    Start-Process "https://aistudio.google.com/apikey"
}

Write-Host ""
$key = Read-Host "Paste GEMINI_API_KEY Anda" -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($key)
try {
    $plain = [Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr).Trim()
} finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) | Out-Null
}

if (-not $plain -or $plain -eq "MY_GEMINI_API_KEY") {
    Write-Host "Key kosong atau masih placeholder. Batal." -ForegroundColor Red
    exit 1
}

if ($plain.Length -lt 20) {
    Write-Host "Key terlalu pendek. Pastikan copy lengkap dari AI Studio." -ForegroundColor Red
    exit 1
}

$lines = @(
    "# Jangan commit file ini (.gitignore sudah memblokir .env*)"
    "GEMINI_API_KEY=$plain"
    "APP_URL=http://localhost:3000"
)
Set-Content -Path $envFile -Value $lines -Encoding UTF8

Write-Host ""
Write-Host "[OK] Disimpan ke .env.local" -ForegroundColor Green
Write-Host "     Lokasi: $envFile" -ForegroundColor Gray
Write-Host ""
Write-Host "Jalankan app:" -ForegroundColor Cyan
Write-Host "  cd $projectRoot" -ForegroundColor Gray
Write-Host "  npm install" -ForegroundColor Gray
Write-Host "  npm run dev" -ForegroundColor Gray
Write-Host ""