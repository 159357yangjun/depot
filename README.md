# 图床 | Image Hosting Platform

**A multi-cloud image hosting, management and publishing platform.**

图床是一个面向创作、文档和内容发布场景的多云图片托管平台。它把图片处理、云端存储、公开链接、图库管理、任务追踪和插件扩展放进同一条发布链里，而不是只做“上传到某一个图床”。

当前开发基线：**v1.3.5**。

## 核心能力

- **多入口发布**：桌面文件、拖拽、剪贴板、图片 URL、Typora、全局快捷键、Windows 右键菜单、Local HTTP API。
- **多云托管**：GitHub、Gitee、Cloudflare R2、S3 Compatible、阿里云 OSS、腾讯云 COS、WebDAV。
- **多云可靠性**：Primary / Mirror / Backup、Mirror All、Primary + Backups、Partial 状态和跨云 Repair。
- **图片处理**：Resize、JPEG / PNG / WebP、质量控制、Rename Template、统一 Workflow。
- **图库管理**：真实远端浏览、预览、下载、删除、新建目录、移动、重命名和批量操作。
- **任务中心**：持久化任务、真实进度、取消、有限重试、失败和中断恢复。
- **插件系统**：Permission Gate、生命周期 Hook、Webhook / AI 插件和执行审计。
- **安全凭据**：Token / Secret / Password 进入操作系统凭据库，不写入普通 SQLite 配置。

## 统一发布链

```text
Desktop / Typora / Clipboard / URL / Tray / Shortcut / HTTP API / Shell Upload
                                  ↓
                         Default Workflow
                                  ↓
                    Resize / Convert / Rename
                                  ↓
                   Primary / Mirror / Backup
                                  ↓
                         Enabled Plugins
                                  ↓
                  Public URL + Asset + Task
```

所有入口复用同一个 Publisher Core / Workflow，不维护第二套上传逻辑。

## 桌面端页面

| 页面 | 用途 |
| --- | --- |
| 发布 | 选择默认云端并快速发布图片 |
| 资源 | 查看本地 Asset / Variant / Deployment 索引 |
| 云端 | 配置 Provider 和多云 Storage Group |
| 图库 | 管理真实远端目录和图片 |
| 插件 | 管理插件权限、生命周期和执行记录 |
| 任务 | 查看上传和批量云端任务，可取消或重试 |
| 设置 | Typora、快捷键、Local API、输出格式和系统诊断 |

## 分支约定

- `main`：稳定、可发布版本。
- `dev`：日常开发主分支。
- `feature/*`：较大的独立功能。
- `fix/*`：独立缺陷修复。

多人或多 Agent 协作时，任何写操作前都应重新拉取远端最新状态，避免基于旧快照覆盖他人提交。

## 本地开发

```powershell
git clone https://github.com/159357yangjun/depot.git
cd depot
git switch dev

cd apps/desktop
npm install
npm run tauri dev
```

项目要求 Node.js `>= 22.12`、Rust stable / Cargo、Windows Tauri 所需的 WebView2 和 Visual Studio C++ Build Tools。

## 验证与发布

静态验证：

```powershell
python scripts/validate.py
python scripts/check_contracts.py
python scripts/check_user_flow.py
```

完整发布检查：

```powershell
./scripts/release.ps1
```

`release.ps1` 会通过 `git archive` 生成只包含 **Git 已跟踪源码** 的干净源码包，因此 `.git`、`target`、`node_modules`、本地缓存、数据库、EXE/MSI 等本地产物不会混进源码归档。

## 文档

- `docs/USER_GUIDE.md`：使用说明
- `docs/ARCHITECTURE.md`：架构说明
- `docs/PLUGIN_ARCHITECTURE.md`：插件模型
- `docs/PROVIDER_MATRIX.md`：Provider 能力矩阵
- `docs/PATCH_V1.3.5.md`：v1.3.5 改动
- `docs/VALIDATION_ACTUAL_2026-09-25_V1.3.5.md`：实际验证范围

## License

见仓库根目录 `LICENSE`。
