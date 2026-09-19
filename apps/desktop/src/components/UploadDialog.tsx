import { useEffect, useMemo, useState } from 'react'
import { ClipboardPaste, FileImage, FolderOpen, Layers3, Link2, LoaderCircle, Sparkles, Upload, Workflow, X } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import {
  chooseImageFiles,
  isTauriRuntime,
  listStorageGroups,
  listStorages,
  listWorkflows,
  publishFiles,
  publishFilesToGroup,
  publishClipboardImageWithWorkflow,
  publishFilesWithWorkflow,
  publishUrlsWithWorkflow,
} from '../lib/desktop'
import { useAppStore } from '../store/useAppStore'

const IMAGE_EXTENSIONS = new Set(['bmp', 'gif', 'jpeg', 'jpg', 'png', 'webp'])

type UploadMode = 'files' | 'urls' | 'clipboard'

function isImagePath(path: string) {
  const normalized = path.replaceAll('\\', '/')
  const name = normalized.split('/').pop() ?? ''
  const extension = name.includes('.') ? name.split('.').pop()?.toLowerCase() : ''
  return extension ? IMAGE_EXTENSIONS.has(extension) : false
}

function displayName(path: string) {
  return path.replaceAll('\\', '/').split('/').pop() || path
}

function parseUrls(value: string) {
  return Array.from(new Set(
    value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean),
  ))
}

export function UploadDialog() {
  const { uploadOpen, setUploadOpen, setPage } = useAppStore()
  const queryClient = useQueryClient()
  const { data: workflows = [] } = useQuery({ queryKey: ['workflows'], queryFn: listWorkflows, enabled: uploadOpen })
  const { data: storages = [] } = useQuery({ queryKey: ['storages'], queryFn: listStorages, enabled: uploadOpen })
  const { data: groups = [] } = useQuery({ queryKey: ['storage-groups'], queryFn: listStorageGroups, enabled: uploadOpen })
  const [paths, setPaths] = useState<string[]>([])
  const [urlsText, setUrlsText] = useState('')
  const [mode, setMode] = useState<UploadMode>('files')
  const [destination, setDestination] = useState('')
  const [dragging, setDragging] = useState(false)

  const defaultDestination = useMemo(() => {
    if (destination) {
      if (mode !== 'files' && !destination.startsWith('workflow:')) return ''
      return destination
    }
    const preferred = workflows.find((workflow) => workflow.isDefault) ?? workflows[0]
    if (preferred) return `workflow:${preferred.id}`
    if (mode !== 'files') return ''
    if (groups[0]) return `group:${groups[0].id}`
    if (storages[0]) return `storage:${storages[0].id}`
    return ''
  }, [destination, groups, mode, storages, workflows])

  useEffect(() => {
    if (!uploadOpen || !isTauriRuntime() || mode !== 'files') return
    let disposed = false
    let unlisten: (() => void) | undefined
    void getCurrentWebviewWindow()
      .onDragDropEvent((event) => {
        if (event.payload.type === 'enter' || event.payload.type === 'over') {
          setDragging(true)
          return
        }
        if (event.payload.type === 'leave') {
          setDragging(false)
          return
        }
        setDragging(false)
        const images = event.payload.paths.filter(isImagePath)
        if (images.length > 0) setPaths((current) => Array.from(new Set([...current, ...images])))
      })
      .then((cleanup) => {
        if (disposed) cleanup()
        else unlisten = cleanup
      })
    return () => {
      disposed = true
      unlisten?.()
      setDragging(false)
    }
  }, [mode, uploadOpen])

  const urls = useMemo(() => parseUrls(urlsText), [urlsText])

  const publishMutation = useMutation({
    mutationFn: async () => {
      if (mode === 'urls') {
        if (!defaultDestination.startsWith('workflow:')) throw new Error('URL 发布需要先选择一个发布方案')
        return publishUrlsWithWorkflow(defaultDestination.slice('workflow:'.length), urls)
      }
      if (mode === 'clipboard') {
        if (!defaultDestination.startsWith('workflow:')) throw new Error('剪贴板发布需要先选择一个发布方案')
        return [await publishClipboardImageWithWorkflow(defaultDestination.slice('workflow:'.length))]
      }
      if (defaultDestination.startsWith('workflow:')) return publishFilesWithWorkflow(defaultDestination.slice('workflow:'.length), paths)
      if (defaultDestination.startsWith('group:')) return publishFilesToGroup(defaultDestination.slice('group:'.length), paths)
      if (defaultDestination.startsWith('storage:')) return publishFiles(defaultDestination.slice('storage:'.length), paths)
      throw new Error('请选择发布方案或目标')
    },
    onSuccess: async () => {
      setPaths([])
      setUrlsText('')
      setDestination('')
      setUploadOpen(false)
      await queryClient.invalidateQueries({ queryKey: ['tasks'] })
      setTimeout(() => {
        void queryClient.invalidateQueries({ queryKey: ['assets'] })
        void queryClient.invalidateQueries({ queryKey: ['tasks'] })
      }, 1200)
    },
  })

  if (!uploadOpen) return null

  async function pickImages() {
    const chosen = await chooseImageFiles()
    if (chosen.length > 0) setPaths((current) => Array.from(new Set([...current, ...chosen.filter(isImagePath)])))
  }

  const selectedWorkflow = defaultDestination.startsWith('workflow:')
    ? workflows.find((workflow) => workflow.id === defaultDestination.slice('workflow:'.length))
    : undefined
  const selectedGroup = defaultDestination.startsWith('group:')
    ? groups.find((group) => group.id === defaultDestination.slice('group:'.length))
    : undefined
  const canPublish = mode === 'files'
    ? paths.length > 0 && Boolean(defaultDestination)
    : mode === 'urls'
      ? urls.length > 0 && defaultDestination.startsWith('workflow:')
      : defaultDestination.startsWith('workflow:')

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/20 p-6 backdrop-blur-sm" onMouseDown={() => setUploadOpen(false)}>
      <section className="w-full max-w-[680px] rounded-[28px] border border-white bg-white p-5 shadow-[0_30px_80px_rgba(15,23,42,.18)]" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between p-2">
          <div><h2 className="text-xl font-semibold">发布资源</h2><p className="mt-1 text-sm text-slate-400">文件、URL 或剪贴板图片都可以交给同一套 Workflow 与多云发布链路。</p></div>
          <button className="rounded-full p-2 text-slate-400 hover:bg-slate-100" onClick={() => setUploadOpen(false)} aria-label="关闭"><X size={18} /></button>
        </div>

        <div className="mt-3 inline-flex rounded-xl bg-slate-100 p-1">
          <button onClick={() => { setMode('files'); setDestination('') }} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium ${mode === 'files' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}><FileImage size={14} />本地文件</button>
          <button onClick={() => { setMode('urls'); setDestination('') }} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium ${mode === 'urls' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}><Link2 size={14} />图片 URL</button>
          <button onClick={() => { setMode('clipboard'); setDestination('') }} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium ${mode === 'clipboard' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}><ClipboardPaste size={14} />剪贴板</button>
        </div>

        {mode === 'files' ? (
          <>
            <button onClick={pickImages} className={`mt-3 grid min-h-[210px] w-full place-items-center rounded-[24px] border border-dashed p-6 text-center transition ${dragging ? 'border-blue-400 bg-blue-50 ring-4 ring-blue-50' : 'border-slate-250 bg-slate-50/70 hover:bg-slate-50'}`}>
              <div><div className="mx-auto grid size-12 place-items-center rounded-2xl bg-white shadow-sm"><Upload size={20} /></div><div className="mt-4 text-sm font-medium">{dragging ? '松开即可添加图片' : '把图片拖到这里，或点击选择'}</div><div className="mt-1 text-xs text-slate-400">JPEG / PNG / WebP / GIF / BMP · 文件直接交给 Rust Core。</div><div className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white"><FolderOpen size={15} />选择文件</div></div>
            </button>
            {paths.length > 0 && <div className="mt-4 max-h-32 overflow-auto rounded-2xl border border-slate-200 p-3"><div className="mb-1 flex items-center justify-between text-[11px] text-slate-400"><span>已选择 {paths.length} 张</span><button onClick={() => setPaths([])} className="hover:text-slate-700">清空</button></div>{paths.map((path) => <div key={path} className="flex items-center gap-2 py-1.5 text-xs text-slate-600"><FileImage size={14} /><span className="truncate">{displayName(path)}</span></div>)}</div>}
          </>
        ) : mode === 'urls' ? (
          <div className="mt-3 rounded-[24px] border border-slate-200 bg-slate-50/60 p-4">
            <div className="flex items-center gap-2 text-sm font-medium"><Link2 size={16} />从 URL 发布</div>
            <p className="mt-1 text-xs leading-5 text-slate-400">每行一个 http/https 图片地址，最多 50 个，单个远端图片最大 32 MB。下载后仍会执行压缩、改名和多云发布。</p>
            <textarea value={urlsText} onChange={(event) => setUrlsText(event.target.value)} placeholder={'https://example.com/a.png\nhttps://example.com/b.jpg'} className="mt-3 min-h-36 w-full resize-y rounded-2xl border border-slate-200 bg-white p-3 font-mono text-xs leading-6 outline-none focus:border-slate-400" />
            <div className="mt-2 text-[11px] text-slate-400">已识别 {urls.length} 个 URL</div>
          </div>
        ) : (
          <div className="mt-3 grid min-h-[210px] place-items-center rounded-[24px] border border-slate-200 bg-slate-50/60 p-6 text-center">
            <div>
              <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-white shadow-sm"><ClipboardPaste size={20} /></div>
              <div className="mt-4 text-sm font-medium">发布系统剪贴板中的图片</div>
              <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-400">先在截图工具、浏览器或图片软件中复制图片，然后选择发布方案。图片仅在点击发布时读取，并直接交给本地 Rust Core 处理。</p>
              <div className="mt-4 text-[11px] text-slate-400">支持截图与复制的位图 · 最大 3200 万像素</div>
            </div>
          </div>
        )}

        <div className="mt-4">
          <div className="flex items-center justify-between"><label className="text-xs font-medium text-slate-500">发布方案</label>{!workflows.length && <button onClick={() => { setUploadOpen(false); setPage('workflows') }} className="text-[11px] font-medium text-indigo-600">创建第一个方案 →</button>}</div>
          <select value={defaultDestination} onChange={(event) => setDestination(event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none">
            {workflows.length > 0 && <optgroup label="我的方案">{workflows.map((workflow) => <option key={workflow.id} value={`workflow:${workflow.id}`}>{workflow.name}{workflow.isDefault ? ' · 默认' : ''}</option>)}</optgroup>}
            {mode === 'files' && groups.length > 0 && <optgroup label="高级 · 直接多云发布">{groups.map((group) => <option key={group.id} value={`group:${group.id}`}>{group.name} · 不做图片处理</option>)}</optgroup>}
            {mode === 'files' && storages.length > 0 && <optgroup label="高级 · 直接单云发布">{storages.map((storage) => <option key={storage.id} value={`storage:${storage.id}`}>{storage.name} · 不做图片处理</option>)}</optgroup>}
          </select>

          {selectedWorkflow && <div className="mt-2 flex items-center gap-3 rounded-xl bg-indigo-50/70 px-3 py-2.5 text-[11px] text-indigo-700"><Workflow size={14} /><span className="font-medium">{selectedWorkflow.format.toUpperCase()} · Q{selectedWorkflow.quality}</span><span>→</span><span className="truncate">{selectedWorkflow.targetName}</span>{selectedWorkflow.isDefault && <span className="ml-auto flex items-center gap-1"><Sparkles size={11} />默认</span>}</div>}
          {selectedGroup && <div className="mt-2 flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-[11px] text-slate-500"><Layers3 size={13} />{selectedGroup.members.map((member) => `${member.storageName} (${member.role})`).join(' · ')}</div>}
          {!storages.length && <div className="mt-2 text-xs text-amber-600">请先到“云端”连接至少一个存储。</div>}
          {mode === 'urls' && !workflows.length && <div className="mt-2 text-xs text-amber-600">URL 发布必须先创建一个 Workflow，这样系统才知道如何处理和发布远端图片。</div>}
        </div>

        {publishMutation.error && <div className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600">{String(publishMutation.error)}</div>}
        <div className="mt-5 flex justify-end"><button disabled={!canPublish || publishMutation.isPending} onClick={() => publishMutation.mutate()} className="flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-30">{publishMutation.isPending && <LoaderCircle size={15} className="animate-spin" />}{mode === 'urls' ? `发布 ${urls.length || ''} 个 URL` : mode === 'clipboard' ? '发布剪贴板图片' : selectedWorkflow ? '按方案发布' : defaultDestination.startsWith('group:') ? '多云发布' : '直接发布'}</button></div>
      </section>
    </div>
  )
}
