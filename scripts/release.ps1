$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

if (-not $env:VITE_DOCS_BASE_URL) {
    Write-Warning "VITE_DOCS_BASE_URL is not set. The desktop build will hide online tutorial links."
}

Write-Host "[1/9] Static project validation"
python scripts/validate.py
python scripts/check_contracts.py
python scripts/check_user_flow.py

Write-Host "[2/9] Resolve dependency locks"
cargo generate-lockfile
Push-Location apps/desktop
npm install --package-lock-only --ignore-scripts
Pop-Location
Push-Location website
npm install --package-lock-only --ignore-scripts
Pop-Location

Write-Host "[3/9] Rust format"
cargo fmt --all -- --check

Write-Host "[4/9] Rust check (locked)"
cargo check --workspace --locked

Write-Host "[5/9] Rust tests (locked)"
cargo test --workspace --locked

Write-Host "[6/9] Desktop dependencies and frontend build"
Push-Location apps/desktop
npm ci
npm run build

Write-Host "[7/9] Tauri bundle"
npm run tauri build
Pop-Location

Write-Host "[8/9] Documentation site"
Push-Location website
npm ci
npm run build
Pop-Location

Write-Host "[9/9] Release summary"
Write-Host "Release validation and bundle completed. Commit Cargo.lock and both package-lock.json files after the first successful networked build."
