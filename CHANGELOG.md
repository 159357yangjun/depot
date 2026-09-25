# Changelog

## 1.3.5 - Task Control, Plugin Observability & Diagnostics

- Added cooperative cancellation for persistent Cloud Manager batch delete/move/rename tasks.
- Added item-level progress updates that cannot revive a task after it has been cancelled.
- Added bounded retry for failed/cancelled Cloud Manager batch tasks using the original persisted payload and a maximum retry budget.
- Added Task Center cancel/retry controls plus retry-attempt visibility.
- Added migration `0013_plugin_execution_logs.sql` and persistent plugin execution audit records for hook, status, duration and failure summary.
- Audit Desktop, Typora/Local API and manual plugin executions through the same plugin repository.
- Added a plugin-page execution activity panel for recent success/failure timing.
- Added Settings system diagnostics for Local API, Storage, plugins, default Workflow and task health.

## 1.3.4 - Lifecycle Completion & Persistent Cloud Tasks

- Added `before_process`, `after_process` and `on_publish_failure` plugin hooks.
- Unified expanded lifecycle execution across Desktop, Typora and the Local HTTP API bridge.
- Upgraded the official Webhook manifest to v1.2.0 without auto-enabling newly introduced hooks.
- Added migration `0012_official_webhook_lifecycle.sql` for existing installs.
- Moved provider-neutral cloud move overwrite/fallback/rollback semantics into `application::CloudMutationCore`.
- Added persistent Task Center jobs for batch cloud delete, move and template rename.
- Updated Cloud Manager to enqueue long-running batch mutations instead of blocking the page.
- Fixed CLI `PluginContext` construction to include lifecycle metadata.


## 1.3.3 - Lifecycle Hooks & Batch Cloud Operations

- Add explicit plugin lifecycle hooks with persisted per-plugin user selections; legacy installs default to `after_upload` only.
- Add host-runtime hook gating and first-class `after_upload`, `on_gallery_delete` and `manual_trigger` events.
- Let Webhook Publisher optionally receive real cloud-delete events with storage/path metadata without making plugin failures roll back a completed remote delete.
- Add Cloud Manager batch move and safe template batch rename with `{name}`, `{stem}`, `{ext}` and `{index}` placeholders.
- Keep batch mutations bounded to 100 files, preserve destination overwrite protection and reconcile Deployment locations after successful moves.
- Split cloud-management and plugin commands into dedicated Rust command modules to continue reducing the monolithic Tauri API layer.
- Expand command contracts to 60/60/60 and source user-flow/reliability/lifecycle contracts to 103 checks.

## 1.3.2 - Zero-context Upload & Cloud Manager Mutations

- Add a real global shortcut (`CommandOrControl+Shift+U`) that uploads the clipboard image through the existing default Workflow and writes final URLs back to the clipboard.
- Persist the global-shortcut preference and actually unregister the OS shortcut when disabled so the key combination is released for other applications.
- Add a Windows Explorer current-user image context-menu integration backed by `--shell-upload`; no administrator-level registry write is required.
- Keep shell, shortcut, Typora, Local HTTP API and desktop uploads on the same default Workflow / multi-cloud / plugin path.
- Extend `StorageProvider` with move/create-directory capabilities and implement native OpenDAL rename/create-dir operations.
- Add safe cloud move fallback (download → upload → delete), destination-overwrite protection and rollback of the destination if source deletion fails.
- Reconcile SQLite Deployment `remote_path` / `public_url` after cloud moves and mark active deployments deleted after batch cloud deletes.
- Upgrade Cloud Manager with create directory, rename, move, multi-select and bounded batch delete controls.
- Expand source user-flow/reliability/integration/cloud-manager contracts from 79 to 93 checks and Tauri command contracts from 49/49/49 to 57/57/57.

## 1.3.1 - Integration Layer & Background Publisher

- Add a token-protected Local HTTP API bound only to `127.0.0.1:36677` for scripts, ShareX-style tools, editor integrations and future agents.
- Reuse the existing default Workflow bridge for both raw-body and local-path HTTP uploads; no second uploader implementation is introduced.
- Keep the Local API token in OS Credential Store and support in-app token rotation that invalidates previous clients immediately.
- Add a real Tauri system tray entry; closing the main window hides it instead of terminating the background publisher, while the tray menu provides explicit open/quit actions.
- Move Typora/output/integration commands out of the monolithic `commands.rs` into `commands/integrations.rs` as the first command-layer decomposition.
- Move CPU-heavy workflow image decode/resize/encode work to Tokio blocking workers for both desktop and CLI/Typora paths.
- Add Settings UI for Local API status, token copy/rotation and call examples.
- Harden command-contract validation to scan nested Rust command modules and keep frontend/Rust/Tauri registration at 49/49/49.
- Expand source user-flow/reliability/integration contracts from 69 to 79 checks.

## 1.3.0 - Publisher Core, Publish Center & Cloud Manager

- Move Storage Group strategy semantics into `application::PublisherCore`; Tauri now delegates `mirror_all` and ordered primary/backup failover instead of owning those rules.
- Make a new Publish Center the default desktop entry: current target, quick target switching, drag/drop, clipboard, URL, output-format controls, recent assets and recent tasks.
- Keep every Publish Center action on the existing hidden workflow/task path instead of introducing a second uploader implementation.
- Upgrade Gallery/Storage Browser with remote download and confirmed permanent delete.
- Reconcile direct cloud deletes back into SQLite by marking every matching active Deployment as deleted.
- Add two Tauri cloud-management commands and keep frontend/backend/registration contracts at 47/47/47.
- Preserve v1.2.5 integrity hardening, plugin Permission Gate and OS credential isolation.
- Product direction is informed by PicGo's low-friction upload flow and PicList's cloud-management/task experience, without copying their Electron/npm-plugin security model.

## 1.2.5 - Publish Integrity Hardening

- Let backup failover survive desktop preflight instead of rejecting a group when Primary is temporarily unhealthy.
- Validate URL batches before task creation so an invalid later URL cannot leave hidden partial tasks.
- Make new remote paths unique per publish and protect shared legacy remote objects during deletion.
- Verify repair sources against the stored content hash before copying them to other clouds.
- Persist Typora partial/cloud/plugin warnings as completed-with-warning, matching the desktop task model.
- Add compensation cleanup when a safe unique remote upload succeeds but local persistence fails.
- Strengthen object-storage and Gitee connection tests, automatic-pipeline setup, long-history loading and public URL validation.

## 1.2.4 - Explicit Plugin Authorization

- Separate plugin Manifest declarations from user-granted permissions; declaration alone no longer authorizes a capability.
- Persist `granted_permissions_json` in SQLite and add migration `0010_plugin_permission_grants.sql`.
- Existing plugins keep only baseline `read_asset`; plugins requesting network, secrets, or external writes are disabled until the user explicitly re-authorizes them.
- Add `set_plugin_permissions` as a Tauri command and share the same grant state across desktop uploads and Typora CLI uploads.
- Add plugin-page permission confirmation before enabling a plugin with missing grants, plus a one-click way to revoke sensitive grants.
- Keep v1.2.3 reliability fixes: real backup failover, GitHub write-access validation, multimodal AI Caption, remote SHA verification and automatic hidden publish chain.
- Expand user-flow/reliability regression contracts from 33 to 40 checks.
- Dependency lock policy remains honest: networked CI generates the resolved lock files and then uses `cargo --locked` / `npm ci`; this offline package does not fabricate lockfiles.

## 1.2.3 - Publish Reliability & Plugin Safety

- Keep the hidden automatic publish chain introduced in v1.2.2 and preserve the single user flow across local, URL, clipboard and Typora uploads.
- Make `primary_with_backups` real failover semantics: mirrors always publish, backups publish only if the primary fails or cannot be initialized.
- Make GitHub connection tests reject tokens that can read the repository but do not have effective repository write access.
- Send the actual remote image as OpenAI-compatible `image_url` multimodal content for AI Image Caption.
- Enforce plugin manifest permissions inside the host runtime for asset reads, network calls, secrets and external writes.
- Upgrade existing official AI Caption plugin manifests to request `secret` permission.
- Pin direct npm dependency versions and make CI/release resolve lock files first, then build with `cargo --locked` and `npm ci`; publish the resolved locks as an artifact.
- Expand user-flow regression checks from 22 to 33 contracts.
- Retain plugin output persistence, post-plugin `asset://published`, OS credential storage for AI keys and automatic default target repair.


## 1.2.1 - Plugin Switches

- Replace the primary “方案” navigation entry with a single plugin control surface.
- Make installed plugins first-class on/off switches; add enable-all and disable-all actions.
- Enabled plugins now participate automatically after successful uploads, including Typora uploads.
- Keep workflow records as an internal processing compatibility layer instead of exposing them as a primary product concept.
- Update Typora and upload copy so users think in terms of upload target + enabled plugins.


## 1.2.0 - Plugin Runtime + AI Planner

- Add manifest-based plugin runtime and plugin marketplace UI.
- Add plugin persistence migration and enable/disable/config/remove commands.
- Add template, webhook and OpenAI-compatible AI prompt host runtimes.
- Add AI provider settings and natural-language workflow planner.
- Keep third-party native code disabled; WASM sandbox remains future work.


## 1.1.0 — Typora workflow bridge & interaction overhaul

- Added GitHub post-upload SHA verification so a task cannot report success before the uploaded path is visible remotely.
- Added one-click Typora setup that copies the Custom Command and launches Typora in one action.
- Added a real Typora custom-command bridge that reuses the current default Workflow and existing system credential store.
- Typora uploads now run through the same Resize / Convert / Rename / Storage or Storage Group pipeline and return one public URL per image on stdout.
- Added in-app Typora setup card with readiness check, one-click command copy, one-click Typora launch and default-workflow shortcut.
- Added publish-target preflight before workflow tasks are queued, so invalid/expired credentials fail visibly before the dialog disappears.
- Reworked the upload dialog into a persistent task panel with per-file progress, aggregate progress, failure details, retry, continue-publishing, task and resource shortcuts.
- Added a first-class “图库” page plus PicList-inspired storage browser with grid/list views, thumbnails, search, directory navigation, refresh, image preview, copy link and open-in-browser actions.
- Removed decorative settings rows that looked interactive but performed no action; settings now expose only real controls and navigation actions.
- Added Typora-originated uploads to task history and resource index so they appear in the desktop application after launch.

## 1.0.3 — Window resize & GitHub credential diagnostics

- Lower Windows minimum window size from 1024×680 to 640×480 and make the desktop shell responsive.
- Collapse the sidebar automatically on narrow windows and make storage setup forms single-column when needed.
- Normalize repository tokens by trimming whitespace and accidental `Bearer ` prefixes.
- Detect SSH keys/fingerprints pasted into the repository token field.
- Add actionable Chinese diagnostics for GitHub 401/403/repository/branch failures.
- Add a direct GitHub Personal Access Token creation shortcut in the setup dialog.

## 1.0.2 — Windows release polish

- Hide the extra Windows console window in production builds with `windows_subsystem = "windows"`.
- Keep the console visible in debug builds for development diagnostics.
- Update the in-app stable version badge to v1.0.2.
- Expand first-use instructions for GitHub/Gitee/object-storage configuration and publish flow.

## 1.0.1 — GitHub image-link reliability

- GitHub uploads and remote browsing now canonicalize public URLs before persisting them.
- GitHub public links use raw content URLs instead of `github.com/.../blob/...` HTML pages.
- Unicode paths, including Chinese filenames, are percent-encoded consistently to prevent mixed/invalid URLs.
- Clipboard output adds a compatibility normalization layer so legacy GitHub blob links are converted to `raw.githubusercontent.com` when copied as URL, Markdown, HTML, BBCode, or custom output.
- Added regression coverage using the real-world Chinese filenames `02_实现层_三维城市沙盘.png` and `04_算法层_算法对比.png`.

## 1.0.0 — Stable feature baseline

- Added production Content Security Policy for the Tauri webview while retaining remote asset previews.
- Added external tutorial-site integration through `VITE_DOCS_BASE_URL` and safe system-browser opening.
- Added Provider-specific “配置教程” entry points and a global “教程与帮助” entry point.
- Standardized copy operations on the Tauri clipboard plugin instead of relying on WebView clipboard behavior.
- Hardened capability declarations for clipboard and external URL operations.
- Added formal Provider matrix and end-user quick-start documentation.
- Promoted the project from milestone builds to the v1.0 stable source baseline.
- Added real Aliyun OSS, Tencent COS and WebDAV storage providers through the StoragePort/OpenDAL boundary.
- Added URL batch publishing with protocol, timeout, MIME and 32 MB safety checks.
- Added system clipboard image publishing through the Tauri clipboard manager and local Rust PNG encoding.
- Added controlled publish concurrency with a four-task semaphore.
- Added automatic recovery of interrupted queued/preparing/running tasks on next startup.
- Added safe Storage deletion that refuses to remove providers still referenced by deployments, groups or workflows.
- Added automatic post-publish clipboard output using URL / Markdown / HTML / BBCode / custom templates.
- Added `asset://published` event flow and explicit clipboard read/write permissions.
- Added OSS/COS/S3/WebDAV and multi-cloud/security tutorial pages to the Astro/Starlight site.
- Added release validation/build scripts, CI workflow, release documentation and MIT license.
- Added release-focused SQLite indexes and bumped all desktop/workspace versions to 1.0.0.

## 0.5.0 — M4

- Added `image-processing` Rust crate with resize, JPEG quality encoding, PNG output, lossy WebP quality encoding and original pass-through.
- Added `workflow-engine` crate that executes ordered Resize → Convert → Rename → Publish → Output steps.
- Added single-storage and Storage-Group publish targets to the Workflow domain model.
- Added persistent Workflow repository and `0005_workflow_recipes.sql` migration.
- Added four built-in Recipe presets: Blog Balanced, Docs Crisp, Small/Fast and Original.
- Added custom Workflow creation, default Workflow selection and deletion.
- Added Workflow publishing tasks that persist processed Variant metadata and reuse M3 multi-cloud/Repair semantics.
- Added rename templates with date, stem, extension, UUID and content-hash placeholders.
- Added first-class Workflow/Recipe page and Recipe-first upload selection.
- Added three-step first-run onboarding on the Assets page.
- Added Astro + Starlight tutorial-site scaffold with R2, GitHub, Gitee and Recipe guides.

## 0.4.0 — M3

- Added persistent Storage Groups with Primary, Mirror and Backup roles.
- Added `mirror_all` and `primary_with_backups` publishing strategies.
- Added multi-cloud group publishing with one Asset and multiple Deployment records.
- Added partial-success semantics so a healthy public copy remains usable when another cloud fails.
- Added `last_error` persistence per Deployment for repair diagnostics.
- Added StorageProvider download support for OpenDAL S3/R2, GitHub and Gitee.
- Added cross-cloud Repair that downloads from a healthy deployment and rebuilds failed/degraded copies.
- Added multi-cloud destination selection to the upload dialog.
- Added Storage Group creation/deletion UI and role editor.
- Added completed-with-warning task presentation for partial multi-cloud operations.
- Added `0004_multicloud_groups.sql` migration and group/deployment status indexes.

## 0.3.0 — M2

- Added real GitHub repository storage adapter using the repository contents API.
- Added real Gitee repository storage adapter using API v5.
- Added repository upload/update, delete and directory browsing.
- Added public Raw URL generation with optional custom public base URL.
- Added repository onboarding UI for owner/repository/branch/root/token.
- Added provider picker for R2, S3, GitHub and Gitee.
- Added storage browser UI for repository providers.
- Added persistent URL / Markdown / HTML / BBCode / custom output preferences.
- Added background remote asset deletion across every recorded deployment.
- Added `app_settings` SQLite migration for application-level preferences.
- Updated provider capabilities so repository storage exposes list/delete/versioning semantics.

## 0.2.0 — M1

- Added OS-native credential storage for cloud secrets.
- Added persistent SQLite repositories for storage, tasks and published assets.
- Added real Cloudflare R2 / S3-compatible connectivity and uploads through Apache OpenDAL.
- Added required public base URL so successful uploads produce externally viewable URLs.
- Added Tauri system file picker and native file drag/drop.
- Added background task lifecycle, progress persistence and `task://updated` events.
- Added Asset → Variant → Deployment persistence after successful publish.
- Added real assets/tasks/storage UI data instead of M0-only mock content.
- Added storage connection testing.
