# ==============================================================================
# TEM NHAN INOX - Complete Asset Downloader & PostgreSQL Catalog Seeder
# Run from D:\temnhaninox-platform:
#   powershell -ExecutionPolicy Bypass -File .\scripts\download-and-seed.ps1
# ==============================================================================

$ErrorActionPreference = "Continue"

$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$FrontendPublic = Join-Path $ProjectRoot "frontend\public"
if (-not (Test-Path $FrontendPublic)) {
    $FrontendPublic = Join-Path $ProjectRoot "public"
}

$ManifestPath = Join-Path $PSScriptRoot "asset-manifest.json"
$SeedSqlPath  = Join-Path $ProjectRoot "infra\postgres\seed_products.sql"

$Manifest = Get-Content -Raw -Encoding UTF8 $ManifestPath | ConvertFrom-Json
$UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"

function Download-WithFallback([string]$PrimaryUrl, [string]$FallbackUrl, [string]$DestPath) {
    $ParentDir = Split-Path $DestPath -Parent
    if (-not (Test-Path $ParentDir)) {
        New-Item -ItemType Directory -Force -Path $ParentDir | Out-Null
    }
    if ((Test-Path $DestPath) -and ((Get-Item $DestPath).Length -gt 1024)) {
        return $true
    }

    foreach ($Url in @($PrimaryUrl, $FallbackUrl)) {
        if (-not $Url) { continue }
        & curl.exe -sS -L --fail --retry 2 --connect-timeout 15 `
            -H "Referer: https://temnhaninox.com/" `
            -A $UA `
            -o $DestPath $Url

        if ($LASTEXITCODE -eq 0 -and (Test-Path $DestPath) -and ((Get-Item $DestPath).Length -gt 1024)) {
            $leaf = Split-Path $DestPath -Leaf
            Write-Host "  [OK] $leaf" -ForegroundColor Green
            return $true
        }
        if (Test-Path $DestPath) { Remove-Item $DestPath -Force }
    }
    Write-Host "  [WARN] Failed: $DestPath" -ForegroundColor Yellow
    return $false
}

Write-Host "1/3 Downloading homepage, logo & video assets into $FrontendPublic ..." -ForegroundColor Cyan
foreach ($item in $Manifest.site_assets) {
    $rel = $item.local_path -replace '^public[\\/]', ''
    $dest = Join-Path $FrontendPublic $rel
    Download-WithFallback $item.primary_url $item.fallback_url $dest | Out-Null
}

# Copy logo-nvx.png to favicon.ico fallback if present
$LogoPng = Join-Path $FrontendPublic "assets\images\logo-nvx.png"
if (Test-Path $LogoPng) {
    Copy-Item $LogoPng (Join-Path $FrontendPublic "favicon.png") -Force
}

Write-Host "`n2/3 Downloading $($Manifest.product_assets.Count) product gallery images ..." -ForegroundColor Cyan
foreach ($item in $Manifest.product_assets) {
    $rel = $item.local_path -replace '^public[\\/]', ''
    $dest = Join-Path $FrontendPublic $rel
    Download-WithFallback $item.primary_url $item.fallback_url $dest | Out-Null
}

Write-Host "`n3/3 Seeding PostgreSQL database (temnhaninox_db) ..." -ForegroundColor Cyan
if (Test-Path $SeedSqlPath) {
    $PgContainer = docker ps --filter "name=postgres" --format "{{.Names}}" | Select-Object -First 1
    if ($PgContainer) {
        Get-Content -Raw -Encoding UTF8 $SeedSqlPath | docker exec -i $PgContainer psql -U postgres -d temnhaninox_db
        Write-Host "[DONE] Seeded all categories & products into container '$PgContainer' (temnhaninox_db)." -ForegroundColor Green
    } else {
        Write-Host "[INFO] No running Postgres container found. Run manually:" -ForegroundColor Yellow
        Write-Host "  Get-Content -Raw -Encoding UTF8 .\infra\postgres\seed_products.sql | docker exec -i <postgres-container> psql -U postgres -d temnhaninox_db"
    }
}
