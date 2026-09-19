import { useEffect } from 'react'
import { AppShell } from './components/AppShell'
import { UploadDialog } from './components/UploadDialog'
import { copyText, getOutputPreferences, isTauriRuntime } from './lib/desktop'
import { formatPublishedAsset } from './lib/output'
import { AssetsPage } from './pages/AssetsPage'
import { SettingsPage } from './pages/SettingsPage'
import { StoragesPage } from './pages/StoragesPage'
import { TasksPage } from './pages/TasksPage'
import { WorkflowsPage } from './pages/WorkflowsPage'
import { useAppStore } from './store/useAppStore'

type PublishedEvent = { name: string; publicUrl: string }

export default function App() {
  const page = useAppStore((s) => s.page)

  useEffect(() => {
    if (!isTauriRuntime()) return
    let unlisten: (() => void) | undefined
    void import('@tauri-apps/api/event').then(({ listen }) =>
      listen<PublishedEvent>('asset://published', async (event) => {
        const { name, publicUrl } = event.payload
        if (!publicUrl) return
        const preferences = await getOutputPreferences()
        if (!preferences.autoCopyAfterPublish) return
        await copyText(formatPublishedAsset(name, publicUrl, preferences))
      }).then((cleanup) => { unlisten = cleanup }),
    )
    return () => unlisten?.()
  }, [])

  return (
    <AppShell>
      {page === 'assets' && <AssetsPage />}
      {page === 'storages' && <StoragesPage />}
      {page === 'workflows' && <WorkflowsPage />}
      {page === 'tasks' && <TasksPage />}
      {page === 'settings' && <SettingsPage />}
      <UploadDialog />
    </AppShell>
  )
}
