import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'

export default defineConfig({
  integrations: [
    starlight({
      title: 'Publisher Guide',
      description: 'Multi-cloud Publisher 的配置与 Recipe 指南',
      sidebar: [
        { label: '开始', items: [{ label: '5 分钟上手', slug: 'index' }] },
        {
          label: '连接云端',
          items: [
            { label: 'Cloudflare R2', slug: 'guides/r2' },
            { label: '阿里云 OSS', slug: 'guides/oss' },
            { label: '腾讯云 COS', slug: 'guides/cos' },
            { label: 'S3 Compatible', slug: 'guides/s3' },
            { label: 'GitHub', slug: 'guides/github' },
            { label: 'Gitee', slug: 'guides/gitee' },
            { label: 'WebDAV', slug: 'guides/webdav' }
          ]
        },
        {
          label: '使用',
          items: [
            { label: '文件 / URL / 剪贴板', slug: 'use/publish' },
            { label: '多云组与修复', slug: 'use/multicloud' },
            { label: '凭据与安全', slug: 'use/security' }
          ]
        },
        { label: 'Recipe', items: [{ label: '怎么选择方案', slug: 'recipes/choose' }] }
      ]
    })
  ]
})
