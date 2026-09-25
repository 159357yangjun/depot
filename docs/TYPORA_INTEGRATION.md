# Typora 集成指南 — v1.2.3

## 前提

只需要在 Publisher 中完成一件事：**至少连接一个云端存储**。

第一个 Storage 保存成功后，Publisher 会自动把它设为默认上传目标并建立内部“自动上传链”。普通用户不需要创建 Workflow，也没有“方案”配置步骤。

如果连接了多个 Storage / Storage Group，可在 **云端** 页面点击“设为默认上传目标”。Typora、应用内文件上传、URL 上传和剪贴板上传会立即共用新的默认目标。

## 一次性配置

1. Publisher → **设置 → Typora 集成**。
2. 确认状态显示“桥接已就绪”。
3. 点击 **一键开始配置**。Publisher 会复制当前安装路径对应的 Custom Command 并启动 Typora。
4. Typora 按 `Ctrl + ,` 打开偏好设置。
5. 图像 → 上传服务 → `Custom Command / 自定义命令`。
6. 粘贴刚才复制的命令。
7. 点击 Typora 的 **Test Uploader / 验证图片上传选项**。

之后可在 Typora 中粘贴图片、右键上传图片或上传全部本地图片。Publisher 主窗口不需要保持打开。

## 运行链

```text
Typora 图片
  ↓
Publisher.exe --typora-upload
  ↓
自动上传链（Resize → WebP → Rename → 默认云端）
  ↓
远端真实上传
  ↓
当前已开启插件
  ↓
插件结果写入 Publisher 资源索引
  ↓
最终公网 URL 输出到 stdout
  ↓
Typora 替换本地图片地址
```

插件警告写入 stderr，不会污染 Typora 需要读取的 URL 输出。

## 切换云端或插件

Typora 命令不需要重配：

- **云端**：把另一个 Storage / Storage Group 设为默认上传目标；
- **插件**：直接开启 / 关闭需要的插件。

下一次 Typora 上传会读取最新配置。

## 故障排查

1. Publisher → 设置 → Typora 集成，先确认“桥接已就绪”；
2. 云端页面对当前默认 Storage 执行“测试连接”；GitHub 会同时确认当前 Token 具备仓库写权限；
3. 任务页面查看 `Typora 发布` 的真实错误；
4. GitHub `401 Bad credentials`：Token 无效、过期或撤销；
5. GitHub fine-grained PAT 上传至少需要目标仓库 `Contents: Read and write`；
6. 如果 AI / Webhook 插件未配置完成，Publisher 会阻止其开启，而不是让每次上传都产生失败警告。

GitHub 上传会在 PUT 后重新读取远端目标并核对 SHA；只有远端文件真实存在才记为成功。
