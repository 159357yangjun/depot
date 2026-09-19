# Architecture Decision — V0.1

## 1. 产品边界

产品不是“本地图库”，核心目标是：

```text
输入资源 → 处理 → 发布到一个或多个云端 → 生成公网 URL → 持续管理部署状态
```

本地仅保存配置、索引、任务状态和必要缓存，不把本地原图管理作为主产品能力。

## 2. 五个核心领域

- **Asset**：用户语义上的一个资源。
- **Variant**：Asset 的具体文件版本，如原图、WebP、缩略图。
- **Deployment**：某 Variant 在某个 Storage 上的一次部署。
- **Workflow**：处理与发布步骤的顺序定义。
- **Task**：实际执行中的异步工作单元。

## 3. Storage 分层

```text
Domain / Application
        ↓
StorageProvider (Port)
        ↓
┌──────────────┬──────────────┬──────────────┐
OpenDAL Adapter GitHub Adapter Gitee Adapter
        ↓
S3/R2/WebDAV...
```

业务层不允许出现 `opendal::Operator`、GitHub API URL 或 Gitee API URL。

## 4. Capability

不同 Provider 能力不相同，所以 UI 和应用层都通过 Capability 判断功能，不假设所有云端都支持移动、公开 URL、版本管理等。

## 5. UI 原则

- 默认简单，高级功能渐进展开
- 上传是动作，不是一级页面
- 首页围绕“已经发布的资源”
- Provider 配置使用向导，不直接暴露所有底层字段
- Storage Group 负责多云主存储、镜像和备份
- Workflow V1 使用线性 Step，不提前设计 DAG

## M2 repository adapters

Repository providers are first-class `StorageProvider` implementations:

```text
Application / Task Engine
          │
          ▼
    StorageProvider
      ├─ OpenDalStorage (R2/S3)
      ├─ GitHubStorage
      └─ GiteeStorage
```

The domain does not import provider SDK types. GitHub/Gitee-specific concepts (owner, repo, branch, content SHA, commit message) are isolated inside their adapters. `StorageCapabilities` tells the UI/application what a configured storage can do.
