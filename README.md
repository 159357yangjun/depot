# Multi-cloud Publisher

**v1.0.0 正式版源码基线**。面向开发者、博客作者和内容创作者的可组合多云资源发布工具：把图片交给应用，经过可复用 Workflow 处理后发布到一个或多个云端，并获得可以直接分享的公网 URL。

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
- 发布成功自动复制默认格式
- 真实远端删除
- Storage 目录浏览
- 后台任务状态、失败错误和中断恢复
- 静态教程站 + Provider 配置教程入口（部署后通过 `VITE_DOCS_BASE_URL` 绑定）

## 产品原则

1. **公开访问优先**：不是“文件上传成功”就结束，而是必须有清晰的公开 URL 语义。
2. **Recipe First**：普通用户先选择用途，不要求先学习对象存储参数。
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
- `docs/PROVIDER_MATRIX.md`：正式 Provider 能力与定位。
- `website/`：Astro + Starlight 静态教程站源码。

## 验证声明

生成本源码包的容器没有安装 Rust toolchain，npm 项目依赖也未安装，因此这里不会虚假声明 `cargo check` 或 Tauri 安装包构建已经通过。当前包会执行可在本环境完成的结构、配置、SQLite migration、TypeScript 语法、命令契约和 ZIP 完整性验证；真正发布安装包前必须在 Windows 开发机或 CI 中运行 `scripts/release.ps1`。

## License

MIT
