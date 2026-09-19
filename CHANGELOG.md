# Changelog

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
