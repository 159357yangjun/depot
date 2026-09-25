$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

if (-not $env:VITE_DOCS_BASE_URL) {
    Write-Warning "VITE_DOCS_BASE_URL is not set. The desktop build will hide online tutorial links."
}

Write-Host "[1/10] Static project validation"
python scripts/validate.py
python scripts/check_contracts.py
python scripts/check_user_flow.py

Write-Host "[2/10] Resolve dependency locks"
cargo generate-lockfile
Push-Location apps/desktop
npm install --package-lock-only --ignore-scripts
Pop-Location
Push-Location website
npm install --package-lock-only --ignore-scripts
Pop-Location

Write-Host "[3/10] Rust format"
cargo fmt --all -- --check

Write-Host "[4/10] Rust check (locked)"
cargo check --workspace --locked

Write-Host "[5/10] Rust tests (locked)"
cargo test --workspace --locked

Write-Host "[6/10] Desktop dependencies and frontend build"
Push-Location apps/desktop
npm ci
npm run build

Write-Host "[7/10] Tauri bundle"
npm run tauri build
Pop-Location

Write-Host "[8/10] Documentation site"
Push-Location website
npm ci
npm run build
Pop-Location

Write-Host "[9/10] Create clean tracked-source archive"
$Version = (Get-Content apps/desktop/package.json | ConvertFrom-Json).version
$ArtifactDir = Join-Path $Root "artifacts"
New-Item -ItemType Directory -Force -Path $ArtifactDir | Out-Null
$SourceArchive = Join-Path $ArtifactDir "image-hosting-platform-v$Version-source.zip"
if (Test-Path $SourceArchive) {
    Remove-Item $SourceArchive -Force
}
git archive --format=zip -o $SourceArchive HEAD
if ($LASTEXITCODE -ne 0) {
    throw "git archive failed"
}
Write-Host "Clean source archive: $SourceArchive"

Write-Host "[10/10] Release summary"
Write-Host "Release validation and bundle completed."
Write-Host "The source archive contains only files tracked by Git; local .git, target, node_modules, caches, databases and installer output are excluded."
Write-Host "Commit Cargo.lock and both package-lock.json files after the first successful networked build."
