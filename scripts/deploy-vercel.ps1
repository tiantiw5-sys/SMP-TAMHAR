# Deploy SMP TAMHAR Portal ke Vercel (gratis, HTTPS, siap PWA/APK)
# Jalankan: powershell -ExecutionPolicy Bypass -File scripts\deploy-vercel.ps1

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

Write-Host ""
Write-Host "=== Deploy Portal SMP TAMHAR ke Vercel ===" -ForegroundColor Cyan
Write-Host ""

# 1. Build production + PWA
Write-Host "[1/3] Build production..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) { throw "Build gagal" }

# 2. Login Vercel (sekali saja — browser akan terbuka)
if (-not (Test-Path "$env:USERPROFILE\.vercel\auth.json")) {
    Write-Host ""
    Write-Host "[2/3] Login Vercel diperlukan (sekali saja)." -ForegroundColor Yellow
    Write-Host "      Browser akan terbuka — login pakai Google atau GitHub." -ForegroundColor Gray
    Write-Host ""
    npx vercel login
    if ($LASTEXITCODE -ne 0) { throw "Login Vercel gagal" }
} else {
    Write-Host "[2/3] Vercel sudah login — lanjut deploy." -ForegroundColor Green
}

# 3. Deploy folder dist
Write-Host ""
Write-Host "[3/3] Upload ke Vercel..." -ForegroundColor Yellow
Copy-Item "$Root\vercel.json" "$Root\dist\vercel.json" -Force
Set-Location "$Root\dist"
$Output = npx vercel deploy --prod --yes 2>&1 | Out-String
Write-Host $Output

if ($Output -match "https://[^\s]+\.vercel\.app") {
    $url = $Matches[0]
    Write-Host ""
    Write-Host "BERHASIL! Portal online di:" -ForegroundColor Green
    Write-Host "  $url" -ForegroundColor White
    Write-Host ""
    Write-Host "Buat APK: buka https://www.pwabuilder.com/ lalu paste URL di atas." -ForegroundColor Cyan
} else {
    Write-Host "Deploy selesai — cek URL di output Vercel di atas." -ForegroundColor Yellow
}