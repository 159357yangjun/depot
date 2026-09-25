import { useState } from 'react'
import { BookOpen, Cloud, ExternalLink, GitBranch, GitFork, HardDrive, LoaderCircle, Server, X } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  createObjectStorage,
  createRepositoryStorage,
  createS3Storage,
  createWebDavStorage,
  getProviderGuideUrl,
  openExternalUrl,
} from '../lib/desktop'
import type {
  CreateObjectStorageInput,
  CreateRepositoryStorageInput,
  CreateS3StorageInput,
  CreateWebDavStorageInput,
  SupportedProviderKey,
} from '../types'

const providerNames: Record<SupportedProviderKey, string> = {
  r2: 'Cloudflare R2',
  s3: 'S3 Compatible',
  oss: '阿里云 OSS',
  cos: '腾讯云 COS',
  github: 'GitHub',
  gitee: 'Gitee',
  webdav: 'WebDAV',
}

function defaultObjectEndpoint(provider: 'oss' | 'cos') {
  return provider === 'oss'
    ? 'https://oss-cn-hangzhou.aliyuncs.com'
    : 'https://cos.ap-guangzhou.myqcloud.com'
}

export function StorageSetupDialog({
  provider,
  onClose,
}: {
  provider: SupportedProviderKey
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const guideUrl = getProviderGuideUrl(provider)
  const isRepository = provider === 'github' || provider === 'gitee'
  const isGenericS3 = provider === 'r2' || provider === 's3'
  const isObject = provider === 'oss' || provider === 'cos'
  const isWebDav = provider === 'webdav'
  const Icon = provider === 'github'
    ? GitFork
    : provider === 'gitee'
      ? GitBranch
      : provider === 'webdav'
        ? HardDrive
        : provider === 's3'
          ? Server
          : Cloud

  const [s3Form, setS3Form] = useState<CreateS3StorageInput>({
    providerKey: provider === 's3' ? 's3' : 'r2',
    name: provider === 's3' ? 'S3 Storage' : 'Cloudflare R2',
    bucket: '',
    region: provider === 'r2' ? 'auto' : 'us-east-1',
    accessKeyId: '',
    secretAccessKey: '',
    publicBaseUrl: '',
    accountId: '',
    endpoint: '',
    root: '',
  })
  const [objectForm, setObjectForm] = useState<CreateObjectStorageInput>({
    providerKey: provider === 'cos' ? 'cos' : 'oss',
    name: providerNames[provider],
    endpoint: isObject ? defaultObjectEndpoint(provider) : '',
    bucket: '',
    root: '',
    publicBaseUrl: '',
    accessKeyId: '',
    secretAccessKey: '',
  })
  const [repoForm, setRepoForm] = useState<CreateRepositoryStorageInput>({
    providerKey: provider === 'gitee' ? 'gitee' : 'github',
    name: providerNames[provider],
    owner: '',
    repo: '',
    branch: 'main',
    root: 'assets',
    publicBaseUrl: '',
    token: '',
  })
  const [webdavForm, setWebdavForm] = useState<CreateWebDavStorageInput>({
    name: 'WebDAV',
    endpoint: '',
    root: '',
    publicBaseUrl: '',
    username: '',
    password: '',
  })

  const mutation = useMutation({
    mutationFn: async () => {
      if (isRepository) return createRepositoryStorage(repoForm)
      if (isGenericS3) return createS3Storage(s3Form)
      if (isObject) return createObjectStorage(objectForm)
      if (isWebDav) return createWebDavStorage(webdavForm)
      throw new Error('不支持的 Provider')
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['storages'] })
      await queryClient.invalidateQueries({ queryKey: ['default-publish-target'] })
      await queryClient.invalidateQueries({ queryKey: ['workflows'] })
      onClose()
    },
  })

  const setS3 = (key: keyof CreateS3StorageInput, value: string) =>
    setS3Form((current) => ({ ...current, [key]: value }))
  const setObject = (key: keyof CreateObjectStorageInput, value: string) =>
    setObjectForm((current) => ({ ...current, [key]: value }))
  const setRepo = (key: keyof CreateRepositoryStorageInput, value: string) =>
    setRepoForm((current) => ({ ...current, [key]: value }))
  const setWebDav = (key: keyof CreateWebDavStorageInput, value: string) =>
    setWebdavForm((current) => ({ ...current, [key]: value }))

  return (
    <div
      className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/25 p-3 sm:p-6 backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <section
        onMouseDown={(event) => event.stopPropagation()}
        className="max-h-[92vh] w-full max-w-[760px] overflow-auto rounded-[24px] border border-white bg-white p-4 shadow-[0_30px_100px_rgba(15,23,42,.22)] sm:rounded-[28px] sm:p-6"
      >
        <div className="flex items-start gap-4">
          <div className="grid size-11 place-items-center rounded-2xl bg-slate-100"><Icon size={19} /></div>
          <div>
            <h2 className="text-lg font-semibold">连接 {providerNames[provider]}</h2>
            <p className="mt-1 text-xs text-slate-400">
              {isRepository
                ? '仓库、分支与 Token 即可开始。公开仓库默认生成 Raw URL。'
                : isWebDav
                  ? '填写 WebDAV 地址与账号，并指定一个可公开访问的基础 URL。'
                  : '先填平台控制台能直接找到的字段；Endpoint 已提供常用默认值。'}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <button
              disabled={!guideUrl}
              onClick={() => guideUrl && void openExternalUrl(guideUrl)}
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-35"
              title={guideUrl ? `查看 ${providerNames[provider]} 配置教程` : '部署 website/ 后设置 VITE_DOCS_BASE_URL 即可启用教程链接'}
            >
              <BookOpen size={14} /> 配置教程
            </button>
            <button onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-100" aria-label="关闭"><X size={18} /></button>
          </div>
        </div>

        {isRepository && (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="显示名称" value={repoForm.name} onChange={(value) => setRepo('name', value)} />
            <Field label="用户名 / Owner" value={repoForm.owner} onChange={(value) => setRepo('owner', value)} placeholder="username" />
            <Field label="仓库名" value={repoForm.repo} onChange={(value) => setRepo('repo', value)} placeholder="images" />
            <Field label="分支" value={repoForm.branch} onChange={(value) => setRepo('branch', value)} placeholder="main" />
            <Field label="资源目录" value={repoForm.root || ''} onChange={(value) => setRepo('root', value)} placeholder="assets" />
            <div>
              <Field label="访问令牌" type="password" value={repoForm.token} onChange={(value) => setRepo('token', value)} placeholder={provider === 'github' ? 'github_pat_... / ghp_...' : 'Access Token'} />
              {provider === 'github' && (
                <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px] leading-5 text-slate-400">
                  <span>填写 Personal Access Token，不是 SSH 密钥、SSH 指纹或 GitHub 密码。</span>
                  <button
                    type="button"
                    onClick={() => void openExternalUrl('https://github.com/settings/personal-access-tokens/new')}
                    className="inline-flex items-center gap-1 font-medium text-slate-600 hover:text-slate-950"
                  >
                    创建 Token <ExternalLink size={11} />
                  </button>
                </div>
              )}
            </div>
            <div className="sm:col-span-2">
              <Field label="自定义公开域名（可选）" value={repoForm.publicBaseUrl || ''} onChange={(value) => setRepo('publicBaseUrl', value)} placeholder="https://img.example.com" />
              <p className="mt-1.5 text-[11px] leading-5 text-slate-400">公开仓库可留空并使用 Raw 地址；私有仓库若要给别人访问，请填写公开代理/CDN 地址。</p>
            </div>
          </div>
        )}

        {isGenericS3 && (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="显示名称" value={s3Form.name} onChange={(value) => setS3('name', value)} />
            <Field label="Bucket" value={s3Form.bucket} onChange={(value) => setS3('bucket', value)} placeholder="images" />
            {provider === 'r2' ? (
              <Field label="Account ID" value={s3Form.accountId || ''} onChange={(value) => setS3('accountId', value)} placeholder="Cloudflare Account ID" />
            ) : (
              <Field label="Endpoint" value={s3Form.endpoint || ''} onChange={(value) => setS3('endpoint', value)} placeholder="https://s3.example.com" />
            )}
            <Field label="Region" value={s3Form.region || ''} onChange={(value) => setS3('region', value)} placeholder={provider === 'r2' ? 'auto' : 'us-east-1'} />
            <Field label="Access Key ID" value={s3Form.accessKeyId} onChange={(value) => setS3('accessKeyId', value)} />
            <Field label="Secret Access Key" type="password" value={s3Form.secretAccessKey} onChange={(value) => setS3('secretAccessKey', value)} />
            <Field label="资源目录（可选）" value={s3Form.root || ''} onChange={(value) => setS3('root', value)} placeholder="assets" />
            <div className="sm:col-span-2">
              <Field label="公开访问域名" value={s3Form.publicBaseUrl || ''} onChange={(value) => setS3('publicBaseUrl', value)} placeholder="https://img.example.com" />
              <p className="mt-1.5 text-[11px] text-slate-400">用于生成别人可以直接打开的 URL。</p>
            </div>
          </div>
        )}

        {isObject && (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="显示名称" value={objectForm.name} onChange={(value) => setObject('name', value)} />
            <Field label="Bucket" value={objectForm.bucket} onChange={(value) => setObject('bucket', value)} placeholder="images" />
            <div className="sm:col-span-2"><Field label="Endpoint" value={objectForm.endpoint} onChange={(value) => setObject('endpoint', value)} placeholder={defaultObjectEndpoint(provider)} /></div>
            <Field label={provider === 'cos' ? 'SecretId' : 'AccessKey ID'} value={objectForm.accessKeyId} onChange={(value) => setObject('accessKeyId', value)} />
            <Field label={provider === 'cos' ? 'SecretKey' : 'AccessKey Secret'} type="password" value={objectForm.secretAccessKey} onChange={(value) => setObject('secretAccessKey', value)} />
            <Field label="资源目录（可选）" value={objectForm.root || ''} onChange={(value) => setObject('root', value)} placeholder="assets" />
            <div className="sm:col-span-2">
              <Field label="公开访问域名" value={objectForm.publicBaseUrl || ''} onChange={(value) => setObject('publicBaseUrl', value)} placeholder="https://img.example.com" />
              <p className="mt-1.5 text-[11px] text-slate-400">建议使用已绑定的 CDN / 自定义域名；不要填写控制台地址。</p>
            </div>
          </div>
        )}

        {isWebDav && (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="显示名称" value={webdavForm.name} onChange={(value) => setWebDav('name', value)} />
            <Field label="资源目录（可选）" value={webdavForm.root || ''} onChange={(value) => setWebDav('root', value)} placeholder="images" />
            <div className="sm:col-span-2"><Field label="WebDAV Endpoint" value={webdavForm.endpoint} onChange={(value) => setWebDav('endpoint', value)} placeholder="https://dav.example.com/remote.php/dav/files/user" /></div>
            <Field label="用户名" value={webdavForm.username} onChange={(value) => setWebDav('username', value)} />
            <Field label="密码 / App Password" type="password" value={webdavForm.password} onChange={(value) => setWebDav('password', value)} />
            <div className="sm:col-span-2">
              <Field label="公开访问域名" value={webdavForm.publicBaseUrl || ''} onChange={(value) => setWebDav('publicBaseUrl', value)} placeholder="https://files.example.com/public" />
              <p className="mt-1.5 text-[11px] text-slate-400">WebDAV 本身不等于公网图床；这里必须填写别人能直接访问资源的公开 URL 前缀。</p>
            </div>
          </div>
        )}

        {mutation.error && <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-3 py-2.5 text-xs leading-5 text-red-600">{String(mutation.error).replace(/^Error:\s*/i, '')}</div>}
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm">取消</button>
          <button disabled={mutation.isPending} onClick={() => mutation.mutate()} className="flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50">
            {mutation.isPending && <LoaderCircle size={15} className="animate-spin" />}
            测试并保存
          </button>
        </div>
      </section>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-slate-600">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-slate-400"
      />
    </label>
  )
}
