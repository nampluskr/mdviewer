import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('markdownBrowser', {
  platform: process.platform,
  selectRootFolder: () => ipcRenderer.invoke('filesystem:select-root-folder'),
  listDirectory: (directoryPath?: string) => ipcRenderer.invoke('filesystem:list-directory', directoryPath),
  readMarkdownFile: (filePath: string) => ipcRenderer.invoke('filesystem:read-markdown-file', filePath)
})
