import { ChevronLeft, Copy, File, Folder, LoaderCircle, X } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { browseStorage, copyText } from '../lib/desktop'
import type { StorageView } from '../types'

function parentPath(path: string) {
  const parts = path.split('/').filter(Boolean)
  parts.pop()
  return parts.join('/')
}

function sizeLabel(size?: number | null) {
  if (size == null) return ''
  if (size > 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`
  return `${Math.max(1, Math.round(size / 1024))} KB`
}

export function StorageBrowserDialog({ storage, onClose }: { storage: StorageView; onClose: () => void }) {
  const [path, setPath] = useState('')
  const queryKey = useMemo(() => ['storage-browser', storage.id, path], [storage.id, path])
  const { data: entries = [], isLoading, error } = useQuery({
    queryKey,
    queryFn: () => browseStorage(storage.id, path),
  })

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/25 p-6 backdrop-blur-sm" onMouseDown={onClose}>
      <section onMouseDown={(event) => event.stopPropagation()} className="flex h-[620px] w-full max-w-[760px] flex-col rounded-[28px] border border-white bg-white shadow-[0_30px_100px_rgba(15,23,42,.22)]">
        <div className="flex items-start gap-3 border-b border-slate-100 p-6">
          <div>
            <h2 className="text-lg font-semibold">{storage.name}</h2>
            <p className="mt-1 text-xs text-slate-400">浏览远端目录 · {storage.detail}</p>
          </div>
          <button onClick={onClose} className="ml-auto rounded-full p-2 text-slate-400 hover:bg-slate-100"><X size={18} /></button>
        </div>
        <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-3">
          <button disabled={!path} onClick={() => setPath(parentPath(path))} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-25"><ChevronLeft size={16} /></button>
          <div className="min-w-0 flex-1 truncate rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">/{path}</div>
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-4">
          {isLoading && <div className="grid h-full place-items-center text-slate-400"><LoaderCircle size={20} className="animate-spin" /></div>}
          {error && <div className="rounded-xl bg-red-50 p-3 text-xs text-red-600">{String(error)}</div>}
          {!isLoading && !error && !entries.length && <div className="grid h-full place-items-center text-sm text-slate-400">这个目录是空的</div>}
          {!isLoading && entries.map((entry) => (
            <div key={entry.path} className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-slate-50">
              <div className="grid size-9 place-items-center rounded-xl bg-slate-100 text-slate-500">{entry.isDir ? <Folder size={16} /> : <File size={16} />}</div>
              <button disabled={!entry.isDir} onClick={() => entry.isDir && setPath(entry.path)} className="min-w-0 flex-1 text-left disabled:cursor-default">
                <div className="truncate text-sm font-medium">{entry.name}</div>
                <div className="mt-0.5 text-[11px] text-slate-400">{entry.isDir ? '目录' : sizeLabel(entry.sizeBytes)}</div>
              </button>
              {!entry.isDir && entry.publicUrl && (
                <button onClick={() => void copyText(entry.publicUrl || '')} className="rounded-lg p-2 text-slate-400 hover:bg-white hover:text-slate-700" title="复制公开链接"><Copy size={14} /></button>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
