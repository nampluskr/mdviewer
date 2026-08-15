import { contextBridge, ipcRenderer } from 'electron'

function invalidPath<T>(message: string): Promise<FileSystemResult<T>> {
  return Promise.resolve({ ok: false, error: { code: 'INVALID_PATH', message } })
}

contextBridge.exposeInMainWorld('markdownBrowser', {
  platform: process.platform,
  selectRootFolder: () => ipcRenderer.invoke('filesystem:select-root-folder'),
  listDirectory: (directoryPath?: string) => (
    directoryPath === undefined || typeof directoryPath === 'string'
      ? ipcRenderer.invoke('filesystem:list-directory', directoryPath)
      : invalidPath('A valid directory path is required.')
  ),
  readFile: (filePath: string) => (
    typeof filePath === 'string'
      ? ipcRenderer.invoke('filesystem:read-file', filePath)
      : invalidPath('A valid file path is required.')
  ),
  resolveRelativeResource: (baseFilePath: string, relativePath: string, expectedType: 'image' | 'markdown') => {
    if (typeof baseFilePath !== 'string' || typeof relativePath !== 'string') {
      return invalidPath('Valid resource paths are required.')
    }
    if (expectedType !== 'image' && expectedType !== 'markdown') {
      return invalidPath('A valid resource type is required.')
    }
    return ipcRenderer.invoke('filesystem:resolve-relative-resource', baseFilePath, relativePath, expectedType)
  },
  writeClipboardText: (text: string) => (
    typeof text === 'string'
      ? ipcRenderer.invoke('clipboard:write-text', text)
      : invalidPath('Text is required for clipboard copy.')
  ),
  consumeInitialMarkdownFile: () => ipcRenderer.invoke('filesystem:consume-initial-markdown-file'),
  openExternalLink: (url: string) => (
    typeof url === 'string'
      ? ipcRenderer.invoke('shell:open-external-link', url)
      : invalidPath('A valid URL is required.')
  )
})
