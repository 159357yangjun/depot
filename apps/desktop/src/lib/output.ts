import type { OutputPreferences } from '../types'

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

export function formatPublishedAsset(name: string, url: string, preferences: OutputPreferences) {
  switch (preferences.defaultFormat) {
    case 'url':
      return url
    case 'html':
      return `<img src="${escapeHtml(url)}" alt="${escapeHtml(name)}">`
    case 'bbcode':
      return `[img]${url}[/img]`
    case 'custom':
      return preferences.customTemplate.replaceAll('{url}', url).replaceAll('{name}', name)
    case 'markdown':
    default:
      return `![${name.replaceAll(']', '\\]')}](${url})`
  }
}
