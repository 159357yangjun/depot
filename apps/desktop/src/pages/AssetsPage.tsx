import { Check, Cloud, Copy, RefreshCw, Search, Sparkles, Trash2, Upload, WifiOff, Plug } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { PageHeader } from '../components/PageHeader'
import {
  copyText,
  deleteAsset,
  getOutputPreferences,
  listAssets,
  listStorages,
  listPlugins,
  repairAsset,
  saveOutputPreferences,
} from '../lib/desktop'
import { useAppStore } from '../store/useAppStore'
import type { AssetView, OutputFormat, OutputPreferences } from '../types'
import { formatPublishedAsset } from '../lib/output'

const sizeLabel = (size: number) =>
  size > 1024 * 1024
    ? `${(size / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(size / 1024))} KB`

export function AssetsPage() {
  const openUpload = useAppStore((state) => state.openUpload)
  const setPage = useAppStore((state) => state.setPage)
  const queryClient = useQueryClient()
  const [assetLimit, setAssetLimit] = useState(200)
  const { data: assets = [] } = useQuery({
    queryKey: ['assets', assetLimit],
    queryFn: () => listAssets(assetLimit),
    refetchInterval: 2500,
  })
  const { data: storages = [] } = useQuery({ queryKey: ['storages'], queryFn: listStorages })
  const { data: plugins = [] } = useQuery({ queryKey: ['plugins'], queryFn: listPlugins })
  const {
    data: preferences = {
      defaultFormat: 'markdown',
      customTemplate: '![{name}]({url})',
      autoCopyAfterPublish: true,
    } as OutputPreferences,
  } = useQuery({ queryKey: ['output-preferences'], queryFn: getOutputPreferences })
  const [search, setSearch] = useState('')
  const [copied, setCopied] = useState<string | null>(null)
  const [repairing, setRepairing] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    if (!keyword) return assets
    return assets.filter(
      (asset) =>
        asset.name.toLowerCase().includes(keyword) ||
        asset.publicUrl.toLowerCase().includes(keyword),
    )
  }, [assets, search])

  const formatMutation = useMutation({
    mutationFn: (defaultFormat: OutputFormat) =>
      saveOutputPreferences({ ...preferences, defaultFormat }),
    onSuccess: (next) => queryClient.setQueryData(['output-preferences'], next),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteAsset,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tasks'] })
      setTimeout(() => {
        void queryClient.invalidateQueries({ queryKey: ['assets'] })
        void queryClient.invalidateQueries({ queryKey: ['tasks'] })
      }, 700)
    },
  })

  const repairMutation = useMutation({
    mutationFn: repairAsset,
    onMutate: (assetId) => setRepairing(assetId),
    onSettled: () => setRepairing(null),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tasks'] })
      setTimeout(() => {
        void queryClient.invalidateQueries({ queryKey: ['assets'] })
        void queryClient.invalidateQueries({ queryKey: ['tasks'] })
      }, 1000)
    },
  })

  async function copy(asset: AssetView) {
    if (!asset.publicUrl) return
    await copyText(formatPublishedAsset(asset.name, asset.publicUrl, preferences))
    setCopied(asset.id)
    window.setTimeout(
      () => setCopied((current) => (current === asset.id ? null : current)),
      1200,
    )
  }

  async function copyPluginOutput(assetId: string, pluginId: string, text: string) {
    if (!text) return
    await copyText(text)
    const key = `${assetId}:${pluginId}`
    setCopied(key)
    window.setTimeout(() => setCopied((current) => (current === key ? null : current)), 1200)
  }

  function remove(asset: AssetView) {
    if (
      window.confirm(
        `从所有已记录的云端位置删除“${asset.name}”吗？这个操作会真正删除远端文件。`,
      )
    ) {
      deleteMutation.mutate(asset.id)
    }
  }

  return (
    <div className="mx-auto max-w-[1320px] px-10 py-9">
      <PageHeader
        title="资源"
        description="所有已经发布到云端的资源；多云副本异常时可以从健康副本自动修复。"
        action={
          <button onClick={() => openUpload('files')} className="flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white">
            <Upload size={16} />上传
          </button>
        }
      />

      <div className="mt-8 flex items-center gap-3">
        <div className="flex h-10 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3">
          <Search size={15} className="text-slate-400" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} className="w-full bg-transparent text-sm outline-none" placeholder="搜索文件名或 URL…" />
        </div>
        <select value={preferences.defaultFormat} onChange={(event) => formatMutation.mutate(event.target.value as OutputFormat)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-600 outline-none" title="默认复制格式">
          <option value="markdown">Markdown</option>
          <option value="url">URL</option>
          <option value="html">HTML</option>
          <option value="bbcode">BBCode</option>
          <option value="custom">自定义模板</option>
        </select>
      </div>

      <section className="mt-6 grid grid-cols-3 gap-5">
        {!filtered.length && (
          <div className="col-span-3 rounded-[26px] border border-dashed border-slate-200 bg-white p-10">
            {search ? <div className="text-center text-sm font-medium">没有匹配的资源</div> : (
              <div>
                <div className="text-center"><div className="mx-auto grid size-11 place-items-center rounded-2xl bg-slate-950 text-white"><Sparkles size={17} /></div><div className="mt-4 text-sm font-semibold">3 步完成第一次公网发布</div><div className="mt-1 text-xs text-slate-400">不用先理解 Endpoint、Workflow 或多云策略；连接云端、按需开启插件，然后上传。</div></div>
                <div className="mx-auto mt-7 grid max-w-3xl grid-cols-3 gap-3">
                  <button onClick={() => setPage('storages')} className={`rounded-2xl border p-4 text-left ${storages.length ? 'border-emerald-100 bg-emerald-50/50' : 'border-slate-200'}`}><Cloud size={16} className={storages.length ? 'text-emerald-600' : 'text-slate-400'} /><div className="mt-3 text-xs font-medium">1. 连接云端</div><div className="mt-1 text-[11px] text-slate-400">{storages.length ? `已连接 ${storages.length} 个` : 'R2 / GitHub / Gitee'}</div></button>
                  <button onClick={() => setPage('plugins')} className={`rounded-2xl border p-4 text-left ${plugins.some((plugin) => plugin.enabled) ? 'border-emerald-100 bg-emerald-50/50' : 'border-slate-200'}`}><Plug size={16} className={plugins.some((plugin) => plugin.enabled) ? 'text-emerald-600' : 'text-slate-400'} /><div className="mt-3 text-xs font-medium">2. 开启插件</div><div className="mt-1 text-[11px] text-slate-400">{plugins.length ? `${plugins.filter((plugin) => plugin.enabled).length}/${plugins.length} 个已开启` : '可选，不安装也能上传'}</div></button>
                  <button disabled={!storages.length} onClick={() => openUpload('files')} className="rounded-2xl border border-slate-200 p-4 text-left disabled:opacity-40"><Upload size={16} className="text-slate-400" /><div className="mt-3 text-xs font-medium">3. 上传图片</div><div className="mt-1 text-[11px] text-slate-400">拖入图片即可发布</div></button>
                </div>
                {storages.length > 0 && <div className="mx-auto mt-4 flex max-w-3xl items-center justify-between rounded-2xl border border-indigo-100 bg-indigo-50/50 px-4 py-3"><div><div className="text-xs font-medium text-indigo-900">主要用 Typora？</div><div className="mt-0.5 text-[11px] text-indigo-700/70">把当前上传链与插件开关接入 Typora，之后粘贴图片即可自动上传。</div></div><button onClick={() => setPage('settings')} className="rounded-xl bg-indigo-600 px-3 py-2 text-xs font-medium text-white">一键配置 Typora →</button></div>}
              </div>
            )}
          </div>
        )}

        {filtered.map((asset) => (
          <article key={asset.id} className="group overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,.035)]">
            <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
              {asset.publicUrl ? (
                <img src={asset.publicUrl} alt={asset.name} className="h-full w-full object-cover" loading="lazy" />
              ) : (
                <div className="grid h-full place-items-center text-xs text-slate-400">No public URL</div>
              )}
              <button disabled={deleteMutation.isPending} onClick={() => remove(asset)} className="absolute right-3 top-3 rounded-xl bg-white/90 p-2 text-slate-400 opacity-0 shadow-sm backdrop-blur transition hover:text-red-500 group-hover:opacity-100" title="删除远端资源">
                <Trash2 size={14} />
              </button>
            </div>

            <div className="p-4">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{asset.name}</div>
                  <div className="mt-1 text-[11px] text-slate-400">{sizeLabel(asset.sizeBytes)} · {asset.mimeType}{asset.width && asset.height ? ` · ${asset.width}×${asset.height}` : ''}</div>
                </div>
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] ${asset.status === 'online' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                  {asset.status === 'online' ? <Check size={11} /> : <WifiOff size={11} />} {asset.status}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-1.5">
                {asset.deployments.map((deployment) => (
                  <span
                    key={`${deployment.storage}-${deployment.role}`}
                    title={deployment.error || `${deployment.providerKey} · ${deployment.role}`}
                    className={`rounded-lg border px-2 py-1 text-[10px] ${deployment.ok ? 'border-slate-200 text-slate-500' : 'border-red-100 bg-red-50 text-red-500'}`}
                  >
                    {deployment.storage} · {deployment.role}
                  </span>
                ))}

                {asset.status === 'partial' && (
                  <button
                    disabled={repairing === asset.id}
                    onClick={() => repairMutation.mutate(asset.id)}
                    className="ml-auto flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-2 text-[10px] font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50"
                    title="从健康云端副本重新写入失败的云端"
                  >
                    <RefreshCw size={12} className={repairing === asset.id ? 'animate-spin' : ''} />
                    修复
                  </button>
                )}

                <button disabled={!asset.publicUrl} onClick={() => copy(asset)} className={`${asset.status === 'partial' ? '' : 'ml-auto'} rounded-lg p-2 text-slate-400 hover:bg-slate-50 disabled:opacity-30`} title={`复制 ${preferences.defaultFormat}`}>
                  {copied === asset.id ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                </button>
              </div>

              {asset.pluginOutputs?.length > 0 && <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                {asset.pluginOutputs.map((output) => { const key = `${asset.id}:${output.pluginId}`; return <div key={key} className="rounded-xl bg-slate-50 px-3 py-2">
                  <div className="flex items-center gap-2"><Plug size={11} className="text-indigo-500" /><span className="text-[10px] font-medium text-slate-500">{output.pluginName}</span>{output.text && <button onClick={() => void copyPluginOutput(asset.id, output.pluginId, output.text)} className="ml-auto rounded-md p-1 text-slate-400 hover:bg-white">{copied === key ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}</button>}</div>
                  {output.text && <div className="mt-1 line-clamp-3 whitespace-pre-wrap text-[11px] leading-5 text-slate-600">{output.text}</div>}
                </div> })}
              </div>}
            </div>
          </article>
        ))}
      </section>
      {assets.length >= assetLimit && (
        <div className="mt-5 text-center">
          <button
            onClick={() => setAssetLimit((current) => Math.min(current + 200, 10_000))}
            disabled={assetLimit >= 10_000}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-600 disabled:opacity-40"
          >
            {assetLimit >= 10_000 ? '已达到本地列表显示上限' : '加载更早的资源'}
          </button>
        </div>
      )}
    </div>
  )
}
