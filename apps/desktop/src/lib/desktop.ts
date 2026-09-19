import { mockBootstrap, mockRecipes } from '../data/mock'
import type {
  AssetView,
  BootstrapSnapshot,
  CreateObjectStorageInput,
  CreateRepositoryStorageInput,
  CreateS3StorageInput,
  CreateWebDavStorageInput,
  CreateStorageGroupInput,
  CreateWorkflowFromRecipeInput,
  CreateCustomWorkflowInput,
  OutputPreferences,
  RecipeView,
  StorageEntryView,
  StorageGroupView,
  StorageView,
  TaskView,
  WorkflowView,
} from '../types'


const docsBaseUrl = (import.meta.env.VITE_DOCS_BASE_URL || '').trim().replace(/\/+$/, '')

export function getDocsBaseUrl(): string | null {
  return docsBaseUrl || null
}

export function getProviderGuideUrl(provider: string): string | null {
  if (!docsBaseUrl) return null
  return `${docsBaseUrl}/guides/${encodeURIComponent(provider)}/`
}

export async function openExternalUrl(url: string): Promise<void> {
  const parsed = new URL(url)
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('只允许打开 http/https 教程地址')
  }
  if (isTauriRuntime()) {
    const { openUrl } = await import('@tauri-apps/plugin-opener')
    await openUrl(url)
    return
  }
  window.open(url, '_blank', 'noopener,noreferrer')
}

export async function copyText(text: string): Promise<void> {
  if (isTauriRuntime()) {
    const { writeText } = await import('@tauri-apps/plugin-clipboard-manager')
    await writeText(text)
    return
  }
  await navigator.clipboard.writeText(text)
}
export function isTauriRuntime() {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

async function invoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import('@tauri-apps/api/core')
  return invoke<T>(command, args)
}

export async function getBootstrapSnapshot(): Promise<BootstrapSnapshot> {
  if (!isTauriRuntime()) return mockBootstrap
  return invoke('bootstrap_snapshot')
}

export async function listStorages(): Promise<StorageView[]> {
  if (!isTauriRuntime()) return []
  return invoke('list_storages')
}

export async function createS3Storage(input: CreateS3StorageInput): Promise<StorageView> {
  return invoke('create_s3_storage', { input })
}

export async function createObjectStorage(input: CreateObjectStorageInput): Promise<StorageView> {
  return invoke('create_object_storage', { input })
}

export async function createWebDavStorage(input: CreateWebDavStorageInput): Promise<StorageView> {
  return invoke('create_webdav_storage', { input })
}

export async function createRepositoryStorage(
  input: CreateRepositoryStorageInput,
): Promise<StorageView> {
  return invoke('create_repository_storage', { input })
}


export async function deleteStorage(storageId: string): Promise<void> {
  return invoke('delete_storage', { storageId })
}

export async function listStorageGroups(): Promise<StorageGroupView[]> {
  if (!isTauriRuntime()) return []
  return invoke('list_storage_groups')
}

export async function createStorageGroup(
  input: CreateStorageGroupInput,
): Promise<StorageGroupView> {
  return invoke('create_storage_group', { input })
}

export async function deleteStorageGroup(groupId: string): Promise<void> {
  return invoke('delete_storage_group', { groupId })
}

export async function testStorage(storageId: string): Promise<{ reachable: boolean; detail: string }> {
  return invoke('test_storage', { storageId })
}

export async function browseStorage(storageId: string, path: string): Promise<StorageEntryView[]> {
  return invoke('browse_storage', { storageId, path })
}


export async function listRecipes(): Promise<RecipeView[]> {
  if (!isTauriRuntime()) return mockRecipes
  return invoke('list_recipes')
}

export async function listWorkflows(): Promise<WorkflowView[]> {
  if (!isTauriRuntime()) return []
  return invoke('list_workflows')
}

export async function createWorkflowFromRecipe(
  input: CreateWorkflowFromRecipeInput,
): Promise<WorkflowView> {
  return invoke('create_workflow_from_recipe', { input })
}

export async function createCustomWorkflow(
  input: CreateCustomWorkflowInput,
): Promise<WorkflowView> {
  return invoke('create_custom_workflow', { input })
}

export async function setDefaultWorkflow(workflowId: string): Promise<void> {
  return invoke('set_default_workflow', { workflowId })
}

export async function deleteWorkflow(workflowId: string): Promise<void> {
  return invoke('delete_workflow', { workflowId })
}

export async function publishFilesWithWorkflow(
  workflowId: string,
  paths: string[],
): Promise<string[]> {
  return invoke('publish_files_with_workflow', { workflowId, paths })
}

export async function publishUrlsWithWorkflow(
  workflowId: string,
  urls: string[],
): Promise<string[]> {
  return invoke('publish_urls_with_workflow', { workflowId, urls })
}

export async function publishClipboardImageWithWorkflow(workflowId: string): Promise<string> {
  if (!isTauriRuntime()) throw new Error('剪贴板图片仅在桌面应用中可用')
  return invoke('publish_clipboard_image_with_workflow', { workflowId })
}

export async function chooseImageFiles(): Promise<string[]> {
  if (!isTauriRuntime()) return []
  const { open } = await import('@tauri-apps/plugin-dialog')
  const result = await open({
    multiple: true,
    directory: false,
    filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'] }],
  })
  if (!result) return []
  return Array.isArray(result) ? result : [result]
}

export async function publishFiles(storageId: string, paths: string[]): Promise<string[]> {
  return invoke('publish_files', { storageId, paths })
}

export async function publishFilesToGroup(groupId: string, paths: string[]): Promise<string[]> {
  return invoke('publish_files_to_group', { groupId, paths })
}

export async function repairAsset(assetId: string): Promise<string> {
  return invoke('repair_asset', { assetId })
}

export async function deleteAsset(assetId: string): Promise<string> {
  return invoke('delete_asset', { assetId })
}

export async function listTasks(): Promise<TaskView[]> {
  if (!isTauriRuntime()) return []
  return invoke('list_tasks')
}

export async function listAssets(): Promise<AssetView[]> {
  if (!isTauriRuntime()) return []
  return invoke('list_assets')
}

export async function getOutputPreferences(): Promise<OutputPreferences> {
  if (!isTauriRuntime()) {
    return { defaultFormat: 'markdown', customTemplate: '![{name}]({url})', autoCopyAfterPublish: true }
  }
  return invoke('get_output_preferences')
}

export async function saveOutputPreferences(
  preferences: OutputPreferences,
): Promise<OutputPreferences> {
  if (!isTauriRuntime()) return preferences
  return invoke('save_output_preferences', { preferences })
}
