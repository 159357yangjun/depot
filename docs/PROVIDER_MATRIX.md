# Provider Matrix — v1.0

| Provider | Main use | Public URL | Browse | Delete | Multi-cloud | New-user note |
| --- | --- | --- | --- | --- | --- | --- |
| Cloudflare R2 | Low-cost public assets | Custom/public base URL | Yes | Yes | Yes | Recommended for first object-storage setup |
| S3 Compatible | AWS / MinIO / third-party S3 | User-supplied public base URL | Yes | Yes | Yes | Advanced users should follow vendor endpoint/region docs |
| Aliyun OSS | Mainland China object storage | Custom/CDN base URL | Yes | Yes | Yes | Prefer limited RAM credentials |
| Tencent COS | Mainland China object storage | Custom/CDN base URL | Yes | Yes | Yes | Prefer limited CAM credentials |
| GitHub | README/docs/small repository assets | Raw/custom base URL | Yes | Yes | Yes | Not positioned as a high-traffic CDN |
| Gitee | China repository assets / mirror / backup | Raw/custom base URL | Yes | Yes | Yes | Best used for repo resources and redundancy |
| WebDAV | NAS/self-hosted/general protocol | User-supplied public base URL | Yes | Yes | Yes | WebDAV itself does not guarantee public delivery |

## Official-provider admission rule

The core product intentionally stays small. An official Provider should have a stable API, clear documentation, programmatic read/write/delete semantics, reasonable personal-user cost, and an onboarding path that can be taught in a short guide. Long-tail providers should use adapters/plugins in later versions instead of inflating the core UI.
