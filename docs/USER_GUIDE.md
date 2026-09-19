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
