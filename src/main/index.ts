import { app, BrowserWindow, session, shell } from 'electron'
import { join } from 'node:path'
import { is } from '@electron-toolkit/utils'

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }
    return entities[character]
  })
}

function configureContentSecurityPolicy(): void {
  const policy = is.dev
    ? "default-src 'self'; base-uri 'self'; object-src 'none'; frame-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self' http://localhost:* ws://localhost:*"
    : "default-src 'self'; base-uri 'self'; object-src 'none'; frame-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'"

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [policy]
      }
    })
  })
}

async function loadWindowContent(window: BrowserWindow): Promise<void> {
  try {
    if (is.dev) {
      const rendererUrl = process.env.ELECTRON_RENDERER_URL
      if (!rendererUrl) throw new Error('ELECTRON_RENDERER_URL is required in development mode.')

      await window.loadURL(rendererUrl)
      return
    }

    await window.loadFile(join(__dirname, '../renderer/index.html'))
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown renderer loading error.'
    const errorPage = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'"><h1>Markdown Browser failed to start</h1><p>${escapeHtml(message)}</p>`
    await window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(errorPage)}`)
  }
}

function createWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true
    }
  })

  window.once('ready-to-show', () => window.show())
  window.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const destination = new URL(url)
      if (destination.protocol === 'https:' || destination.protocol === 'http:') {
        void shell.openExternal(destination.toString())
      }
    } catch {
      // Ignore invalid external navigation URLs.
    }

    return { action: 'deny' }
  })
  window.webContents.on('will-navigate', (event) => event.preventDefault())
  void loadWindowContent(window)

  return window
}

app.whenReady().then(() => {
  configureContentSecurityPolicy()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
