import { Bell, Database, KeyRound, Palette, Router, Shield, Sparkles } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { PageHeader } from '../components/PageHeader'
import { getOutputPreferences, saveOutputPreferences } from '../lib/desktop'
import type { OutputFormat, OutputPreferences } from '../types'

export function SettingsPage() {
  const queryClient = useQueryClient()
  const { data } = useQuery({ queryKey: ['output-preferences'], queryFn: getOutputPreferences })
  const [form, setForm] = useState<OutputPreferences>({ defaultFormat: 'markdown', customTemplate: '![{name}]({url})', autoCopyAfterPublish: true })

  const rows = [
    { icon: Palette, title: '外观', detail: '跟随系统主题与清爽布局', value: 'System' },
    { icon: Bell, title: '行为', detail: '发布完成自动复制链接', value: form.autoCopyAfterPublish ? '已开启' : '已关闭' },
    { icon: KeyRound, title: '凭据', detail: 'Token 与 Secret 存入系统安全凭据库', value: '安全存储' },
    { icon: Router, title: '网络', detail: '上传任务受控并发，避免打满连接', value: '4 并发' },
    { icon: Database, title: '数据', detail: 'SQLite 仅保存索引、状态与非敏感配置', value: 'Local index' },
    { icon: Shield, title: '隐私与安全', detail: '密钥不写入数据库与教程网页', value: 'Recommended' },
  ]

  useEffect(() => {
    if (data) setForm(data)
  }, [data])

  const mutation = useMutation({
    mutationFn: saveOutputPreferences,
    onSuccess: (saved) => queryClient.setQueryData(['output-preferences'], saved),
  })

  return (
    <div className="mx-auto max-w-[1000px] px-10 py-9">
      <PageHeader title="设置" description="这里只放应用级设置；具体云端配置归属于对应 Storage。" />

      <section className="mt-8 rounded-[24px] border border-slate-200/80 bg-white p-5">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="text-sm font-semibold">链接输出</div>
            <div className="mt-1 text-xs text-slate-400">资源页复制按钮默认生成的格式。</div>
          </div>
          <select value={form.defaultFormat} onChange={(event) => setForm((current) => ({ ...current, defaultFormat: event.target.value as OutputFormat }))} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none">
            <option value="markdown">Markdown</option>
            <option value="url">URL</option>
            <option value="html">HTML</option>
            <option value="bbcode">BBCode</option>
            <option value="custom">自定义</option>
          </select>
        </div>
        <label className="mt-5 flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
          <div><div className="text-xs font-medium text-slate-700">发布完成后自动复制</div><div className="mt-0.5 text-[11px] text-slate-400">按上面的默认格式，把最新公网链接写入系统剪贴板。</div></div>
          <input type="checkbox" checked={form.autoCopyAfterPublish} onChange={(event) => setForm((current) => ({ ...current, autoCopyAfterPublish: event.target.checked }))} className="size-4 accent-slate-950" />
        </label>
        <div className="mt-5">
          <label className="text-xs font-medium text-slate-600">自定义模板</label>
          <input value={form.customTemplate} onChange={(event) => setForm((current) => ({ ...current, customTemplate: event.target.value }))} placeholder="![{name}]({url})" className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 px-3 font-mono text-xs outline-none focus:border-slate-400" />
          <div className="mt-1.5 text-[11px] text-slate-400">支持 {'{url}'} 与 {'{name}'}。自定义格式必须包含 {'{url}'}。</div>
        </div>
        {mutation.error && <div className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600">{String(mutation.error)}</div>}
        <div className="mt-4 flex justify-end">
          <button disabled={mutation.isPending} onClick={() => mutation.mutate(form)} className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50">保存输出设置</button>
        </div>
      </section>

      <section className="mt-6 overflow-hidden rounded-[24px] border border-slate-200/80 bg-white">
        {rows.map(({ icon: Icon, title, detail, value }, index) => (
          <div key={title} className={`flex w-full items-center gap-4 p-5 text-left ${index ? 'border-t border-slate-100' : ''}`}>
            <div className="grid size-9 place-items-center rounded-xl bg-slate-100 text-slate-500"><Icon size={16} /></div>
            <div><div className="text-sm font-medium">{title}</div><div className="mt-0.5 text-xs text-slate-400">{detail}</div></div>
            <span className="ml-auto text-xs text-slate-400">{value}</span>
          </div>
        ))}
      </section>

      <div className="mt-6 rounded-[24px] border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-5">
        <div className="flex items-center gap-2 text-sm font-medium text-indigo-900"><Sparkles size={16} /> 设计原则</div>
        <p className="mt-2 max-w-2xl text-xs leading-6 text-indigo-700/70">普通用户默认只看简单路径。Endpoint、分支细节和高级 URL 规则只在需要时展开；复杂度不应该出现在第一次上传之前。</p>
      </div>
    </div>
  )
}
