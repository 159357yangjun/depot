# Multi-cloud Publisher

**v1.3.5 Task Control + Observability 源码基线**。这一版不继续扩 Provider，而是把后台任务和插件生命周期推进到“可控制、可追踪、可诊断”：Cloud Manager 批量任务可以取消和有限重试，插件 Hook 有持久化执行审计，设置页增加系统诊断。

## v1.3.5：任务可控制 + 插件可观测 + 系统诊断

- Cloud Manager 持久化批量任务支持 cooperative cancel；每处理一个远端对象都会检查任务是否仍为 active；
- 进度 SQL 带 active-state 条件，取消后的任务不会被 worker 重新写回 `running`；
- 失败/取消的 Cloud Manager 批量任务可复用原始 payload 重试，最多 3 次，并在 Task Center 显示重试次数；
- 新增 `plugin_execution_logs`，记录插件、Hook、成功/失败、耗时和错误摘要；Desktop、Typora/Local API、手动插件执行都会写审计；
- 插件页新增最近执行记录，WebHook/AI 调试不再只能翻任务 warning；
- 设置页新增系统诊断，集中显示 Local API、Storage、插件、默认 Workflow 与失败/运行任务状态。

详细实现见 `docs/PATCH_V1.3.5.md`；实际验证范围见 `docs/VALIDATION_ACTUAL_2026-09-25_V1.3.5.md`。

## v1.3.4：生命周期闭环 + 后台批量任务

- 插件新增 `before_process / after_process / on_publish_failure`，与已有 `after_upload / on_gallery_delete / manual_trigger` 形成第一版完整生命周期；
- Desktop、Typora 与 Local HTTP API 复用同一 Hook 语义，避免入口分叉；
- 官方 Webhook v1.2.0 支持完整生命周期，但升级后用户启用项仍保持 `after_upload`，不会突然增加副作用；
- Cloud Manager 批量删除 / 移动 / 模板改名可进入 Task Center 后台执行，状态持久化并沿用中断恢复规则；
- 云端 Move 的“禁止覆盖、原生 move 优先、download→upload→delete fallback、删除失败回滚目标副本”下沉到 `application::CloudMutationCore`；
- 修正 CLI 插件 `PluginContext` 缺失 `metadata` 字段的问题。

详细实现见 `docs/PATCH_V1.3.4.md`；实际验证范围见 `docs/VALIDATION_ACTUAL_2026-09-25_V1.3.4.md`。

## v1.3.3：插件生命周期 + 批量云端操作

- 插件触发器首次落地：`after_upload / on_gallery_delete / manual_trigger`；
- Cloud Manager 增加批量移动和 `{name}/{stem}/{ext}/{index}` 模板重命名；
- `commands/storage_entries.rs` 与 `commands/plugins.rs` 从主 command 模块拆出。

## v1.3.2：不用先打开主窗口，也能发布与管理

这一版继续沿着 v1.3.1 的 Integration Layer 落地：

- **全局快捷上传**：`CommandOrControl+Shift+U` 直接读取剪贴板图片 → 默认 Workflow → 云端 → 最终 URL 回写剪贴板；设置页可真实注册/注销快捷键，关闭时释放系统注册；
- **Windows Explorer 右键上传**：当前用户级 `HKCU\Software\Classes\SystemFileAssociations\image` 菜单，不要求管理员权限；调用 `--shell-upload` 并复用默认 Workflow；
- **Cloud Manager 写操作**：新建目录、重命名、移动、多选、批量删除；远端 Move/Delete 后同步修正本地 Deployment 路径/状态；
- 对支持原生 rename/create_dir 的 OpenDAL Provider 直接调用云端能力；其他 Provider 的 Move 使用受控 download → upload → delete fallback，并带目标覆盖保护与失败回滚；
- 快捷键/右键/Typora/Local HTTP API/桌面 UI 仍然共用同一个发布链，没有新增第二套 uploader。

详细实现见 `docs/PATCH_V1.3.2.md`；实际验证范围见 `docs/VALIDATION_ACTUAL_2026-09-23_V1.3.2.md`。

## v1.3.1：Publisher 变成后台上传服务

在 v1.3.0 的 Publish Center / Publisher Core 上继续补齐“无感上传入口”：

```text
Desktop / Typora / Local HTTP API / Tray
                   ↓
              Default Workflow
                   ↓
         Resize / Convert / Rename
                   ↓
        Primary / Mirror / Backup
                   ↓
            Enabled Plugins
```

本版新增：

- **Local HTTP API**：只监听 `127.0.0.1:36677`，上传必须携带 Bearer Token；
- Token 保存在 **OS Credential Store**，设置页可复制/轮换；
- `POST /v1/upload` 支持原始图片二进制，`POST /v1/upload-paths` 支持本机路径数组；
- HTTP 上传直接复用 Typora 使用的默认 Workflow bridge，不复制上传逻辑；
- **系统托盘 + 后台模式**：关闭主窗口后仍可保持上传服务运行；
- command 层开始按 Integration 职责拆分；
- 图片 decode / resize / encode 使用 `spawn_blocking`，避免占用 async 网络 IO worker；
- 命令契约升级为嵌套模块扫描，当前前端/Rust/Tauri 注册保持 49/49/49。

详细实现见 `docs/PATCH_V1.3.1.md`；横向取舍见 `docs/REFERENCE_COMPARISON_PICGO_PICLIST_PICUPLOADER.md`。

## v1.3.0：默认进入“发布”，而不是管理后台

日常路径现在是：

```text
拖拽 / 文件 / 剪贴板 / URL / Typora
                 ↓
             Publisher Core
                 ↓
        Resize / Convert / Rename
                 ↓
       Primary / Mirror / Backup
                 ↓
           Enabled Plugins
                 ↓
        URL + Asset + Task 状态
```

这一版的结构性变化：

- 新的 **Publish Center** 成为默认首页：可直接拖拽、切换默认云端、选择剪贴板/URL、切换输出格式，并查看最近发布和任务；
- 多云组的 `mirror_all` / `primary_with_backups` 策略移入 `crates/application::PublisherCore`，Tauri command 不再独占业务规则；
- 图库从只读浏览升级为安全 Cloud Manager：支持下载与确认删除远端文件；
- 从图库直接删除真实云端对象后，会把匹配的 SQLite Deployment 同步标为 `deleted`；
- Publish Center 仍复用原有 UploadDialog / hidden pipeline / task engine，不存在第二套“简化上传”逻辑；
- v1.2.5 的 failover、批量原子校验、唯一远端路径、Repair 哈希校验、补偿删除、写权限探测等可靠性修复全部保留；
- 插件仍采用 **Manifest 声明 + 用户授权 + Host Runtime**，不改成任意 npm/Node 插件默认执行。

设计取舍与本版实现见 `docs/PATCH_V1.3.0.md`。

## v1.2.5：发布一致性加固

这一阶段重点解决“远端状态、SQLite 状态、任务状态、Typora 状态”不一致：Backup 真正可接管、URL 批量先校验、远端路径唯一化、Repair 校验内容哈希、Typora 保存 warning，以及安全的远端补偿删除。

## v1.2.0：插件 Runtime + AI Workflow Planner

新增应用内插件市场、受限 Host Runtime、OpenAI-compatible AI Provider 与自然语言 Workflow Planner。v1.1.0 的 Typora 直传、上传进度、远端验证和云端图库继续保留。

## v1.1.0：Typora 直传 + 可见上传过程 + 云端图库

- **一级“图库”页面**：直接读取云端 Storage 的真实文件列表，不依赖本地上传历史。

这次不再把“任务已提交”当成“上传成功”。发布窗口会一直保留并显示 **预检查 → 图片处理 → 上传 → 远端确认 → 写入索引 → 完成/失败** 的真实进度；如果 GitHub Token、分支或目标存储不可用，会在任务创建前直接提示。GitHub 上传返回成功后还会重新读取目标路径并比对 SHA，远端没有真实文件就不会标记成功。

Typora 现在可以直接调用 Publisher 自动维护的**默认上传链**：

```text
Typora 粘贴/拖入图片
        ↓
Publisher CLI bridge
        ↓
自动上传链
Resize / WebP / Rename
        ↓
GitHub / Gitee / R2 / Storage Group
        ↓
公网 URL 返回 Typora
```

应用内 `设置 → Typora 集成` 会自动生成当前安装路径对应的 Custom Command。“一键开始配置”会先复制命令再启动 Typora；Publisher GUI 不需要持续打开，Typora 调用同一个发行版 EXE 的 `--typora-upload` 模式完成同步上传。

云端的“浏览”也升级成远端图库：支持图片缩略图、网格/列表、搜索、目录导航、刷新、预览、复制公开链接和浏览器打开。设计思路参考 PicList 的 Gallery / Cloud Management，但继续保持当前产品自己的 Storage / Workflow 模型。

## v1.0.3 窗口缩放与 GitHub 凭据修复

- 主窗口最小尺寸从 `1024×680` 降到 `640×480`，窄窗口自动收缩侧栏，Storage 配置弹窗自动切换单列。
- 移除前端 `960px` 的硬最小宽度，窗口可以正常拖动缩放和最大化。
- GitHub Token 会自动去掉首尾空格 / `Bearer ` 前缀，并识别误填的 SSH 密钥或指纹。
- GitHub `401 / 403 / 仓库不存在 / 分支不存在` 会显示不同的中文排查提示。
- GitHub 配置页新增 Personal Access Token 创建快捷入口。

## v1.0.2 Windows 启动修复

Windows 正式发行版不再额外弹出黑色命令行窗口。`main.rs` 使用 Tauri 官方推荐的 release-only Windows subsystem 配置；开发模式仍保留控制台，便于排查日志。

第一次使用建议按 **云端 → 插件 → 上传资源**：先连接一个 Provider，再按需开启插件，最后上传本地图片 / URL / 剪贴板图片。详细字段见 `docs/USER_GUIDE.md`。

## v1.0 能做什么

### 三种发布入口
- 本地文件：文件选择 + Tauri 原生拖拽。
- 图片 URL：批量导入远端图片，再执行相同的图片处理与多云发布流程。
- 系统剪贴板：截图或复制图片后直接发布，无需先保存文件。

### 7 个正式 Provider
- Cloudflare R2
- S3 Compatible
- 阿里云 OSS
- 腾讯云 COS
- GitHub
- Gitee
- WebDAV

### Workflow / Recipe
- Resize
- JPEG / PNG / WebP / Original
- JPEG / WebP 质量控制
- Rename Template
- 单 Storage 或 Storage Group 目标
- 4 个官方 Recipe + 自定义方案 + 默认方案

### 多云协作
- Primary / Mirror / Backup
- Mirror All
- Primary + Backups
- Partial 成功状态
- 从健康云端跨云 Repair，不依赖本地原图

### 资源管理
- `Asset → Variant → Deployment` 统一索引
- URL / Markdown / HTML / BBCode / 自定义输出模板
- GitHub 图片输出自动使用 Raw URL；历史 `blob` 页面链接在复制时自动转为 Raw，中文文件名统一 URL 编码
- 发布成功自动复制默认格式
- 真实远端删除
- Storage 目录浏览
- 后台任务状态、失败错误和中断恢复
- 静态教程站 + Provider 配置教程入口（部署后通过 `VITE_DOCS_BASE_URL` 绑定）

## 产品原则

1. **公开访问优先**：不是“文件上传成功”就结束，而是必须有清晰的公开 URL 语义。
2. **Automatic Pipeline**：普通用户只选择默认云端和插件开关，不要求管理内部处理 Pipeline。
3. **渐进复杂度**：Endpoint、分支、Root、多云策略只在真正需要时出现。
4. **Provider 少而精**：优先维护大厂、低成本、注册/配置清晰的平台。
5. **多云是组合，不是切换图床**：Storage Group 统一定义 Primary / Mirror / Backup。
6. **Workflow 与 Storage 解耦**：处理规则和存储目标可以独立复用。
7. **安全凭据**：Token / Secret / Password 进入操作系统凭据库，不写入普通 SQLite 配置。

## 架构

```text
React / TypeScript / Tauri UI
            │
            ▼
      Application Use Cases
            │
            ▼
         Rust Domain
   Asset / Workflow / Task
            │
    ┌───────┴─────────┐
    ▼                 ▼
Storage Port       SQLite
    │
    ├─ OpenDAL: R2 / S3 / OSS / COS / WebDAV
    ├─ GitHub Adapter
    └─ Gitee Adapter
```

Rust Workspace：

```text
crates/
├─ domain
├─ application
├─ task-engine
├─ image-processing
├─ workflow-engine
├─ storage-core
├─ storage-opendal
├─ storage-github
├─ storage-gitee
├─ persistence-sqlite
└─ credential-store
```

## 开发运行

要求：Node.js >= 22.12、Rust stable、Tauri 2 对应系统依赖。

```powershell
cd apps/desktop
npm install
npm run tauri dev
```

教程站：

```powershell
cd website
npm install
npm run dev
```

桌面端需要显示教程入口时，在 `apps/desktop/.env` 中设置：

```text
VITE_DOCS_BASE_URL=https://docs.example.com
```

不要在教程 URL 中携带 Token、Secret 或账户凭据。

## 正式构建

Windows PowerShell：

```powershell
./scripts/release.ps1
```

脚本会依次执行静态验证、`cargo fmt`、`cargo check`、`cargo test`、前端 build、Tauri bundle 和教程站 build。

仓库同时包含 `.github/workflows/release.yml`。推送 `v*` Tag 或手动触发后，会在 `windows-latest` 生成 Windows 安装包 artifact，并单独构建静态教程站。

## 文档

- `docs/RELEASE_V1.0.md`：正式版功能范围与构建说明。
- `docs/ARCHITECTURE.md`：整体架构。
- `docs/MILESTONES.md`：里程碑。
- `docs/VALIDATION.md`：当前包实际执行过的验证与环境限制。
- `docs/USER_GUIDE.md`：用户快速上手。
- `docs/TYPORA_INTEGRATION.md`：Typora 自定义上传命令与自动上传链。
- `docs/PROVIDER_MATRIX.md`：正式 Provider 能力与定位。
- `website/`：Astro + Starlight 静态教程站源码。

## 验证声明

生成本源码包的容器没有安装 Rust toolchain，npm 项目依赖也未安装，因此这里不会虚假声明 `cargo check` 或 Tauri 安装包构建已经通过。当前包会执行可在本环境完成的结构、配置、SQLite migration、TypeScript 语法、命令契约和 ZIP 完整性验证；真正发布安装包前必须在 Windows 开发机或 CI 中运行 `scripts/release.ps1`。

## License

MIT
