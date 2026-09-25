# Multi-cloud Publisher 用户指南

## v1.2.3 推荐路径

普通用户现在只需要理解 **云端 → 插件 → 上传**。系统内部仍使用 Pipeline / Workflow 执行图片处理，但不再要求用户创建“方案”。

1. **云端**：连接第一个 Provider。保存成功后它会自动成为默认上传目标；如果有多个云端，可随时点击“设为默认上传目标”。
2. **插件（可选）**：从市场安装插件。新插件默认关闭；先完成配置，再打开开关。
3. **上传资源**：本地文件、图片 URL、剪贴板全部共用同一条自动上传链。
4. **Typora（可选）**：设置 → Typora 集成 → 一键开始配置。之后 Typora 与应用内上传共用默认云端和插件开关。
5. **图库**：读取 Storage 远端真实内容；**资源**：查看 Publisher 已记录的 Asset、云端副本和插件输出。

### GitHub 最短验证路线

- 云端 → 添加存储 → GitHub；
- 填 Owner / Repo / Branch / Root / Personal Access Token；
- 点击“测试并保存”；
- 保存成功后不用再创建 Recipe 或 Workflow；
- 直接点“上传资源”选择图片。

如果 Root 填 `assets`，图库浏览的是仓库的 `assets/`；仓库根目录里以前手动上传的旧图片不会出现在这个 Root 视图中。

### 插件语义

插件在远端上传成功后执行。AI Caption / Markdown 类插件返回的文本会保存到资源记录并在“资源”卡片显示和复制；Webhook 类插件产生真实网络副作用。插件失败不会回滚已经成功的远端图片。

# User Guide — v1.0

## Fast path

1. Open **云端** and connect one Provider. New users can start with R2; domestic object-storage users can choose OSS/COS; repository users can choose GitHub/Gitee.
2. Open **方案** and install one Recipe. `博客 · WebP 均衡` is the general default.
3. Click **上传资源** and choose local files, image URLs, or a clipboard image.
4. When publishing completes, the resource appears under **资源** and the preferred URL/Markdown format can be copied automatically.

## Multi-cloud

Create a Storage Group when one remote copy is not enough. Assign Primary / Mirror / Backup roles and choose a publishing strategy. A partial failure keeps healthy deployments visible. Use Repair to recreate failed copies from a healthy cloud source.

## What beginners do not need to learn first

Endpoint, Region, Raw URL, object-key rules and repository branch details stay inside Provider setup. Recipe defaults keep compression/resize/rename details out of the first-upload path.

## Tutorial-site integration

`website/` contains the static Starlight documentation site. Deploy it to any static host, then set the desktop build variable:

```text
VITE_DOCS_BASE_URL=https://docs.example.com
```

The desktop application will then expose **教程与帮助** and Provider-specific **配置教程** buttons. Secrets are never included in tutorial URLs.
## GitHub 图片链接

GitHub 仓库里的文件页面地址（`https://github.com/<owner>/<repo>/blob/<branch>/<path>`）返回的是 HTML 页面，不应作为图片直链。Publisher 对 GitHub Storage 使用 Raw 内容地址（`https://raw.githubusercontent.com/...`），并在复制输出时自动修正历史 blob 链接。

包含中文、空格或其他非 ASCII 字符的文件名会统一做 URL 百分号编码；用户无需手动拼接 `%E...` 编码。Markdown 图片输出始终使用 `![名称](Raw URL)`。



## 第一次使用：推荐 GitHub 路线

如果你已经有 GitHub 仓库，这是最快的验证方式。

1. 进入 **云端 → 添加存储 → GitHub**。\n2. 填写：\n   - 显示名称：任意，例如 `PicList`\n   - 用户名 / Owner：GitHub 用户名，例如 `159357yangjun`\n   - 仓库名：例如 `PicList`\n   - 分支：通常是 `main`\n   - 资源目录：建议 `assets`；如果希望直接上传到仓库根目录可清空\n   - 访问令牌：GitHub Personal Access Token\n   - 自定义公开域名：公开仓库通常留空，系统自动使用 `raw.githubusercontent.com`\n3. 点击 **测试并保存**。成功后会出现在“我的存储”。\n4. 进入 **方案**，选择一个 Recipe，例如 **博客 · WebP 均衡**，并把发布目标设为刚连接的 GitHub。\n5. 点击左侧 **上传资源**，选择本地文件 / 图片 URL / 剪贴板图片，再点击发布。\n6. 完成后在 **资源** 中复制 URL / Markdown / HTML / BBCode。

GitHub Token 建议使用 fine-grained token，并且只授权目标仓库；上传需要 Repository permission 的 **Contents: Read and write**。

## Gitee

路径与 GitHub 类似：**云端 → 添加存储 → Gitee**。填写 Owner、仓库名、`main` 分支、资源目录和访问令牌。公开仓库可以直接生成公开地址；如果仓库是私有的，则需要配置一个能公开访问这些文件的代理 / CDN 基础 URL。

## R2 / S3 / OSS / COS

对象存储除 Bucket 和访问密钥外，还要配置 **公开访问域名**。这个值不是控制台地址，而是别人能直接打开图片的 URL 前缀，例如 `https://img.example.com`。Cloudflare R2 还需要 Account ID；S3 Compatible 需要 Endpoint；OSS/COS 使用对应区域 Endpoint。

## 多云发布

连接至少两个存储后，可在 **云端 → 创建多云组** 中设置 Primary / Mirror / Backup，然后把该组设为默认上传目标。Mirror 始终同步；Backup 仅在 Primary 失败时接管。应用与 Typora 会自动使用这个默认目标。


## GitHub `Bad credentials` 排查

如果 **测试并保存** 返回 `401 Bad credentials`，说明 GitHub 没有接受当前 Token。Owner、仓库名和分支通常不是这个错误的原因。

1. 不要填写 GitHub **SSH and GPG keys** 页面里的 SSH 公钥、指纹或私钥。
2. 使用 **Settings → Developer settings → Personal access tokens → Fine-grained tokens** 创建 Personal Access Token。
3. Repository access 只选择需要发布图片的仓库即可。
4. Repository permissions 将 **Contents** 设置为 **Read and write**。
5. 复制新 Token 到 Publisher；Token 只显示一次，请不要发到聊天、截图或提交进 Git。
6. 如果 Token 已过期、撤销或复制不完整，重新生成。

v1.0.3 会自动清除 Token 首尾空格和误粘贴的 `Bearer ` 前缀，并对 SSH key / SSH 指纹误填给出明确提示。

## 窗口缩放

v1.0.3 将 Windows 最小窗口尺寸调整为 `640×480`，并让侧边栏和 Storage 配置弹窗响应式适配。可以正常使用标题栏最大化按钮或拖动窗口边缘缩放。

## Windows 启动窗口

正式 `tauri build` / NSIS / MSI 发行版不会显示额外的黑色命令行窗口；`tauri dev` 和 debug build 仍保留控制台，方便开发调试。\n
## 云端图库

左侧“图库”是远端真实内容视图，不是本地上传历史：

1. 选择已经连接的 Storage；
2. 进入目录或搜索文件名；
3. Grid / List 查看；
4. 图片可直接预览、复制公开 URL、用浏览器打开；
5. 点击刷新重新从 Provider 拉取列表。

GitHub / Gitee 会读取仓库目录；R2 / S3 / OSS / COS / WebDAV 会读取对应远端目录。
