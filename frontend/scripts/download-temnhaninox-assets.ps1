# ==============================================================================
# TEM NHAN INOX - Live HTML Scraper & Local Asset Bundler (Exact Slot Mapping)
# Run: powershell -ExecutionPolicy Bypass -File .\scripts\download-temnhaninox-assets.ps1
# ==============================================================================

$ErrorActionPreference = "Continue"

$BaseDir = Join-Path $PSScriptRoot "..\frontend\public\assets"
if (-not (Test-Path (Join-Path $PSScriptRoot "..\frontend"))) {
    $BaseDir = Join-Path $PSScriptRoot "..\public\assets"
}

$ImgDir = Join-Path $BaseDir "images"
$VidDir = Join-Path $BaseDir "videos"

New-Item -ItemType Directory -Force -Path $ImgDir | Out-Null
New-Item -ItemType Directory -Force -Path $VidDir | Out-Null

$UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"

Write-Host "Fetching live HTML from https://temnhaninox.com/ ..." -ForegroundColor Cyan
$Html = & curl.exe -sS -L --connect-timeout 15 -A $UA "https://temnhaninox.com/"

if (-not $Html) {
    Write-Host "[ERROR] Could not fetch https://temnhaninox.com/ HTML." -ForegroundColor Red
    exit 1
}

# Extract all /wp-content/uploads/ image URLs
$Matches = [regex]::Matches($Html, 'https?://[^"''\s>]+/wp-content/uploads/[^"''\s>]+\.(?:jpg|jpeg|png|webp)', 'IgnoreCase')
$AllUrls = $Matches | ForEach-Object { $_.Value } | Select-Object -Unique
$FullUrls = $AllUrls | Where-Object { $_ -notmatch '-\d+x\d+\.(jpg|jpeg|png|webp)$' }
if ($FullUrls.Count -lt 6) {
    $FullUrls = $AllUrls
}

Write-Host "Found $($FullUrls.Count) unique upload images on homepage:" -ForegroundColor Green
for ($i = 0; $i -lt $FullUrls.Count; $i++) {
    Write-Host "  [$i] $($FullUrls[$i])" -ForegroundColor DarkGray
}

function Save-Asset([string]$Url, [string]$DestPath) {
    if (-not $Url) { return $false }
    $fileName = Split-Path $DestPath -Leaf
    & curl.exe -sS -L --fail --retry 2 --connect-timeout 15 `
        -H "Referer: https://temnhaninox.com/" `
        -A $UA `
        -o $DestPath $Url

    if ($LASTEXITCODE -eq 0 -and (Test-Path $DestPath) -and ((Get-Item $DestPath).Length -gt 1024)) {
        $sizeKb = [math]::Round((Get-Item $DestPath).Length / 1KB, 1)
        Write-Host "  [OK] $fileName <- $Url ($sizeKb KB)" -ForegroundColor Green
        return $true
    }
    if (Test-Path $DestPath) { Remove-Item $DestPath -Force }
    return $false
}

# 1. Logo
$LogoUrl = $FullUrls | Where-Object { $_ -match 'cropped|logo|Them-tieu-de' } | Select-Object -First 1
if ($LogoUrl) {
    Save-Asset $LogoUrl (Join-Path $ImgDir "logo-nvx.png") | Out-Null
}

# 2. Find index of first real category card (AMIXTECH), skipping logo and coffee banner
$StartIdx = 0
for ($i = 0; $i -lt $FullUrls.Count; $i++) {
    if ($FullUrls[$i] -notmatch 'cropped|logo|Them-tieu-de|coffee|ba-den') {
        $StartIdx = $i
        break
    }
}

$OrderedTargets = @(
    "cat-tem-nhan.jpg",
    "cat-cnc.jpg",
    "cat-laser.jpg",
    "cat-may-moc.jpg",
    "cat-luu-niem.jpg",
    "workshop-1.jpg",
    "workshop-2.jpg",
    "workshop-3.jpg",
    "workshop-4.jpg",
    "project-bg.jpg"
)

Write-Host "`nDownloading and mapping category & workshop images into $ImgDir ..." -ForegroundColor Cyan
for ($k = 0; $k -lt $OrderedTargets.Count; $k++) {
    $urlIdx = $StartIdx + $k
    if ($urlIdx -lt $FullUrls.Count) {
        Save-Asset $FullUrls[$urlIdx] (Join-Path $ImgDir $OrderedTargets[$k]) | Out-Null
    } else {
        Write-Host "  [SKIP] No remaining image candidate for $($OrderedTargets[$k])" -ForegroundColor Yellow
    }
}

# 3. Hero Video (skip if already downloaded)
$HeroVid = Join-Path $VidDir "hero-workshop.mp4"
if ((Test-Path $HeroVid) -and ((Get-Item $HeroVid).Length -gt 10240)) {
    $sizeKb = [math]::Round((Get-Item $HeroVid).Length / 1KB, 1)
    Write-Host "  [SKIP] hero-workshop.mp4 already exists ($sizeKb KB)" -ForegroundColor DarkGray
} else {
    $VidMatch = [regex]::Match($Html, 'https?://[^"''\s>]+/wp-content/uploads/[^"''\s>]+\.mp4', 'IgnoreCase')
    if ($VidMatch.Success) {
        Save-Asset $VidMatch.Value $HeroVid | Out-Null
    }
}

Write-Host "`nDone! Local assets are ready under /assets/images/ and /assets/videos/." -ForegroundColor Cyan
