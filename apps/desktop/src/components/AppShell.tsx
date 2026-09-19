import type { ReactNode } from 'react'
import { BookOpen, Boxes, Cloud, ListTodo, Settings, Upload, Workflow, Zap } from 'lucide-react'
import { getDocsBaseUrl, openExternalUrl } from '../lib/desktop'
import { useAppStore } from '../store/useAppStore'
import type { PageKey } from '../types'

const items: Array<{ key: PageKey; label: string; icon: typeof Boxes }> = [
  { key: 'assets', label: '资源', icon: Boxes },
  { key: 'storages', label: '云端', icon: Cloud },
  { key: 'workflows', label: '方案', icon: Workflow },
  { key: 'tasks', label: '任务', icon: ListTodo },
  { key: 'settings', label: '设置', icon: Settings },
]

export function AppShell({ children }: { children: ReactNode }) {
  const { page, setPage, setUploadOpen } = useAppStore()
  const docsUrl = getDocsBaseUrl()

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-slate-900">
      <aside className="fixed inset-y-0 left-0 z-30 w-[220px] border-r border-slate-200/70 bg-white/78 backdrop-blur-xl">
        <div className="flex h-full flex-col p-4">
          <div className="flex items-center gap-3 px-2 py-3">
            <div className="grid size-9 place-items-center rounded-2xl bg-slate-950 text-white shadow-sm"><Zap size={17} /></div>
            <div>
              <div className="text-[15px] font-semibold tracking-[-0.02em]">Publisher</div>
              <div className="text-[11px] text-slate-400">Multi-cloud workspace</div>
            </div>
          </div>

          <button
            className="mt-5 flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white shadow-[0_8px_30px_rgba(15,23,42,.16)] transition hover:-translate-y-0.5"
            onClick={() => setUploadOpen(true)}
          >
            <Upload size={16} /> 上传资源
          </button>

          <nav className="mt-6 space-y-1">
            {items.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setPage(key)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                  page === key ? 'bg-slate-100 font-medium text-slate-950' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                <Icon size={17} strokeWidth={1.8} />
                {label}
              </button>
            ))}
          </nav>

          <div className="mt-auto space-y-2">
            {docsUrl && (
              <button onClick={() => void openExternalUrl(docsUrl)} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800">
                <BookOpen size={14} /> 教程与帮助
              </button>
            )}
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3">
              <div className="text-xs font-medium text-slate-700">v1.0 · Stable</div>
              <div className="mt-1 text-[11px] leading-5 text-slate-400">文件 / URL / 剪贴板 · 多云发布</div>
              <div className="mt-3 flex items-center gap-2 text-[11px] text-emerald-600"><span className="size-1.5 rounded-full bg-emerald-500" /> 正式版功能已就绪</div>
            </div>
          </div>
        </div>
      </aside>
      <main className="ml-[220px] min-h-screen">{children}</main>
    </div>
  )
}
