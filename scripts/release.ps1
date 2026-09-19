$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

if (-not $env:VITE_DOCS_BASE_URL) {
    Write-Warning "VITE_DOCS_BASE_URL is not set. The desktop build will hide online tutorial links."
}

Write-Host "[1/8] Static project validation"
python scripts/validate.py
python scripts/check_contracts.py

Write-Host "[2/8] Rust format"
cargo fmt --all -- --check

Write-Host "[3/8] Rust check"
cargo check --workspace

Write-Host "[4/8] Rust tests"
cargo test --workspace

Write-Host "[5/8] Desktop dependencies and frontend build"
Push-Location apps/desktop
npm install
npm run build

Write-Host "[6/8] Tauri bundle"
npm run tauri build
Pop-Location

Write-Host "[7/8] Documentation site"
Push-Location website
npm install
npm run build
Pop-Location

Write-Host "[8/8] Release summary"
Write-Host "Release validation and bundle completed."
