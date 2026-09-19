import { AlertCircle, CheckCircle2, CircleDashed, LoaderCircle, TriangleAlert } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { PageHeader } from '../components/PageHeader'
import { isTauriRuntime, listTasks } from '../lib/desktop'

export function TasksPage() {
  const queryClient = useQueryClient()
  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: listTasks,
    refetchInterval: 1500,
  })

  useEffect(() => {
    if (!isTauriRuntime()) return
    let unlisten: (() => void) | undefined
    import('@tauri-apps/api/event').then(({ listen }) =>
      listen('task://updated', () => {
        void queryClient.invalidateQueries({ queryKey: ['tasks'] })
        void queryClient.invalidateQueries({ queryKey: ['assets'] })
      }).then((cleanup) => {
        unlisten = cleanup
      }),
    )
    return () => unlisten?.()
  }, [queryClient])

  return (
    <div className="mx-auto max-w-[1180px] px-10 py-9">
      <PageHeader title="任务" description="单云发布、多云发布、修复与远端删除都由 Rust 后台任务引擎执行。" />
      <section className="mt-8 overflow-hidden rounded-[24px] border border-slate-200/80 bg-white">
        {!tasks.length && <div className="p-10 text-center text-sm text-slate-400">暂无任务</div>}
        {tasks.map((task, index) => {
          const hasWarning = task.status === 'completed' && Boolean(task.error)
          const Icon =
            task.status === 'failed'
              ? AlertCircle
              : hasWarning
                ? TriangleAlert
                : task.status === 'completed'
                  ? CheckCircle2
                  : ['running', 'preparing'].includes(task.status)
                    ? LoaderCircle
                    : CircleDashed
          const iconClass =
            task.status === 'failed'
              ? 'bg-red-50 text-red-500'
              : hasWarning
                ? 'bg-amber-50 text-amber-600'
                : task.status === 'completed'
                  ? 'bg-emerald-50 text-emerald-500'
                  : 'bg-blue-50 text-blue-500'

          return (
            <div key={task.id} className={`flex items-center gap-4 p-5 ${index ? 'border-t border-slate-100' : ''}`}>
              <div className={`grid size-10 place-items-center rounded-2xl ${iconClass}`}>
                <Icon size={18} className={['running', 'preparing'].includes(task.status) ? 'animate-spin' : ''} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{task.title}</div>
                <div className={`mt-1 text-xs ${task.status === 'failed' ? 'text-red-500' : hasWarning ? 'text-amber-600' : 'text-slate-400'}`}>
                  {task.detail}{task.error ? ` · ${task.error}` : ''}
                </div>
                {['running', 'preparing', 'queued'].includes(task.status) && (
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${task.progress}%` }} />
                  </div>
                )}
              </div>
              <div className="w-16 text-right text-xs font-medium text-slate-400">{task.progress}%</div>
            </div>
          )
        })}
      </section>
    </div>
  )
}
