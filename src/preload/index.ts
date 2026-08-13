import { contextBridge } from 'electron'

contextBridge.exposeInMainWorld('markdownBrowser', {
  platform: process.platform
})
