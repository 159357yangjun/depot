# Validation Notes — v1.0.0

## Checks executed in the packaging environment

- All project JSON files parse successfully.
- All project TOML files parse successfully.
- Every Cargo workspace member points to an existing crate manifest.
- SQLite migrations `0001` through `0006` execute successfully against an in-memory SQLite database.
- The schema contains 9 application tables and release query indexes.
- Desktop TypeScript / TSX source files are syntax-parsed with the locally installed TypeScript compiler API.
- Frontend `invoke(...)` command names are compared with Rust `#[tauri::command]` functions and handler registration.
- Tauri capabilities explicitly cover dialogs, clipboard text output, clipboard image intent, and safe external tutorial URLs.
- Production CSP is enabled; arbitrary remote scripts are not permitted. Remote HTTP/HTTPS images remain allowed because published assets must be previewable.
- ZIP integrity and SHA-256 are verified after packaging.

## Important environment limitation

This packaging container does **not** include `cargo` / `rustc`, and npm dependencies cannot be fully installed from the network here. Therefore this environment cannot truthfully claim that these commands passed:

- `cargo check --workspace`
- `cargo test --workspace`
- `npm run build`
- `npm run tauri build`
- `npm run build` in `website/`

Before distributing a Windows installer, run `scripts/release.ps1` on a Windows development machine or CI runner with Rust stable, Node.js 22+ and the Tauri 2 system build dependencies.

## v1 runtime assumptions

- JPEG/PNG/WebP/GIF/BMP are accepted by the file picker. Workflows that decode images rely on the codecs enabled in `image-processing`.
- `Original` with no Resize passes bytes through without re-encoding.
- WebP and JPEG support quality controls; PNG is lossless re-encoding.
- Workflow remains a sequential pipeline. DAG/branching is intentionally not part of v1.
- A Workflow publishes to one Storage or one Storage Group.
- Multi-cloud Repair reads a healthy remote deployment and recreates failed/degraded copies without requiring the original local file.
- Secrets remain desktop-only and are stored through the operating system credential store.
- The tutorial site is static. Set `VITE_DOCS_BASE_URL` when building the desktop client to enable in-app tutorial links.
