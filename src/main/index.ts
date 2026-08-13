import { app, BrowserWindow, dialog, ipcMain, session, shell } from 'electron'
import type { OpenDialogOptions } from 'electron'
import { promises as fs } from 'node:fs'
import { dirname, isAbsolute, join, resolve } from 'node:path'
import { is } from '@electron-toolkit/utils'
import { isWithinRoot } from './filesystem-boundary'

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

type FileSystemErrorCode =
  | 'ACCESS_DENIED'
  | 'INVALID_PATH'
  | 'NOT_FOUND'
  | 'NOT_A_DIRECTORY'
  | 'NOT_A_MARKDOWN_FILE'
  | 'NO_ROOT_SELECTED'
  | 'READ_FAILED'

type FileSystemResult<T> = { ok: true; value: T } | { ok: false; error: { code: FileSystemErrorCode; message: string } }

interface DirectoryEntry {
  name: string
  path: string
  type: 'directory' | 'markdown'
}

interface InitialMarkdownFile {
  rootPath: string
  filePath: string
  name: string
  content: string
}

const windowRoots = new Map<number, string>()
const initialMarkdownFiles = new Map<number, FileSystemResult<InitialMarkdownFile | null>>()

function succeeded<T>(value: T): FileSystemResult<T> {
  return { ok: true, value }
}

function failed<T>(code: FileSystemErrorCode, message: string): FileSystemResult<T> {
  return { ok: false, error: { code, message } }
}

function errorResult<T>(error: unknown, fallbackCode: FileSystemErrorCode, fallbackMessage: string): FileSystemResult<T> {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code?: string }).code
    if (code === 'ENOENT') return failed('NOT_FOUND', 'The requested path no longer exists.')
    if (code === 'EACCES' || code === 'EPERM') return failed('ACCESS_DENIED', 'Access to the requested path was denied.')
  }
  return failed(fallbackCode, fallbackMessage)
}

async function resolvePathWithinRoot(rootPath: string, requestedPath: string): Promise<FileSystemResult<string>> {
  if (typeof requestedPath !== 'string' || requestedPath.length === 0) {
    return failed('INVALID_PATH', 'A valid path is required.')
  }

  if (!isAbsolute(requestedPath)) {
    return failed('INVALID_PATH', 'Paths must be absolute.')
  }

  const absolutePath = resolve(requestedPath)
  if (!isWithinRoot(rootPath, absolutePath)) {
    return failed('ACCESS_DENIED', 'The requested path is outside the selected root folder.')
  }

  try {
    const realPath = await fs.realpath(absolutePath)
    if (!isWithinRoot(rootPath, realPath)) {
      return failed('ACCESS_DENIED', 'The requested path resolves outside the selected root folder.')
    }
    return succeeded(realPath)
  } catch (error) {
    return errorResult(error, 'INVALID_PATH', 'The requested path is invalid.')
  }
}

function rootForSender(senderId: number): FileSystemResult<string> {
  const rootPath = windowRoots.get(senderId)
  return rootPath ? succeeded(rootPath) : failed('NO_ROOT_SELECTED', 'Select a root folder before accessing files.')
}

async function initialMarkdownFileFromArguments(): Promise<FileSystemResult<InitialMarkdownFile | null>> {
  const fileArgument = process.argv.slice(1).find((argument) => argument.toLowerCase().endsWith('.md'))
  if (!fileArgument) return succeeded(null)

  try {
    const filePath = await fs.realpath(resolve(fileArgument))
    const stats = await fs.stat(filePath)
    if (!stats.isFile() || !filePath.toLowerCase().endsWith('.md')) {
      return failed('NOT_A_MARKDOWN_FILE', 'The launch argument is not a Markdown file.')
    }

    const rootPath = await fs.realpath(dirname(filePath))
    return succeeded({
      rootPath,
      filePath,
      name: filePath.split(/[\\/]/).filter(Boolean).pop() ?? filePath,
      content: await fs.readFile(filePath, 'utf8')
    })
  } catch (error) {
    return errorResult(error, 'READ_FAILED', 'Unable to open the requested Markdown file.')
  }
}

function registerFileSystemHandlers(): void {
  ipcMain.handle('filesystem:select-root-folder', async (event): Promise<FileSystemResult<{ rootPath: string }>> => {
    const window = BrowserWindow.fromWebContents(event.sender)
    const dialogOptions: OpenDialogOptions = { properties: ['openDirectory'] }
    const result = window
      ? await dialog.showOpenDialog(window, dialogOptions)
      : await dialog.showOpenDialog(dialogOptions)
    if (result.canceled || result.filePaths.length === 0) return failed('INVALID_PATH', 'No folder was selected.')

    try {
      const rootPath = await fs.realpath(result.filePaths[0])
      const stats = await fs.stat(rootPath)
      if (!stats.isDirectory()) return failed('NOT_A_DIRECTORY', 'The selected path is not a folder.')
      windowRoots.set(event.sender.id, rootPath)
      return succeeded({ rootPath })
    } catch (error) {
      return errorResult(error, 'INVALID_PATH', 'The selected folder is invalid.')
    }
  })

  ipcMain.handle('filesystem:list-directory', async (event, directoryPath?: string): Promise<FileSystemResult<DirectoryEntry[]>> => {
    const root = rootForSender(event.sender.id)
    if (!root.ok) return root
    const target = await resolvePathWithinRoot(root.value, directoryPath ?? root.value)
    if (!target.ok) return target

    try {
      const stats = await fs.stat(target.value)
      if (!stats.isDirectory()) return failed('NOT_A_DIRECTORY', 'The requested path is not a folder.')
      const entries = await fs.readdir(target.value, { withFileTypes: true })
      const visibleEntries: DirectoryEntry[] = []
      let skippedUnsafeEntry = false

      for (const entry of entries) {
        const entryPath = resolve(target.value, entry.name)
        const resolvedEntry = await resolvePathWithinRoot(root.value, entryPath)
        if (!resolvedEntry.ok) {
          skippedUnsafeEntry = true
          continue
        }

        const entryStats = await fs.stat(resolvedEntry.value)
        if (entryStats.isDirectory()) visibleEntries.push({ name: entry.name, path: resolvedEntry.value, type: 'directory' })
        if (entryStats.isFile() && entry.name.toLowerCase().endsWith('.md')) {
          visibleEntries.push({ name: entry.name, path: resolvedEntry.value, type: 'markdown' })
        }
      }

      visibleEntries.sort((left, right) => left.type.localeCompare(right.type) || left.name.localeCompare(right.name))
      if (skippedUnsafeEntry) {
        return failed('ACCESS_DENIED', 'Some folder entries were excluded because they resolve outside the selected root folder.')
      }
      return succeeded(visibleEntries)
    } catch (error) {
      return errorResult(error, 'READ_FAILED', 'Unable to list the requested folder.')
    }
  })

  ipcMain.handle('filesystem:read-markdown-file', async (event, filePath: string): Promise<FileSystemResult<{ content: string }>> => {
    const root = rootForSender(event.sender.id)
    if (!root.ok) return root
    const target = await resolvePathWithinRoot(root.value, filePath)
    if (!target.ok) return target
    if (!target.value.toLowerCase().endsWith('.md')) return failed('NOT_A_MARKDOWN_FILE', 'Only Markdown files can be opened.')

    try {
      const stats = await fs.stat(target.value)
      if (!stats.isFile()) return failed('NOT_A_MARKDOWN_FILE', 'Only Markdown files can be opened.')
      return succeeded({ content: await fs.readFile(target.value, 'utf8') })
    } catch (error) {
      return errorResult(error, 'READ_FAILED', 'Unable to read the requested Markdown file.')
    }
  })

  ipcMain.handle('filesystem:consume-initial-markdown-file', (event): FileSystemResult<InitialMarkdownFile | null> => {
    const initialFile = initialMarkdownFiles.get(event.sender.id) ?? succeeded(null)
    initialMarkdownFiles.delete(event.sender.id)
    return initialFile
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

function createWindow(initialMarkdownResult: FileSystemResult<InitialMarkdownFile | null> = succeeded(null)): BrowserWindow {
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

  const webContentsId = window.webContents.id
  if (initialMarkdownResult.ok && initialMarkdownResult.value) {
    windowRoots.set(webContentsId, initialMarkdownResult.value.rootPath)
  }
  if (!initialMarkdownResult.ok || initialMarkdownResult.value) {
    initialMarkdownFiles.set(webContentsId, initialMarkdownResult)
  }
  window.once('ready-to-show', () => window.show())
  window.on('closed', () => {
    windowRoots.delete(webContentsId)
    initialMarkdownFiles.delete(webContentsId)
  })
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

app.whenReady().then(async () => {
  configureContentSecurityPolicy()
  registerFileSystemHandlers()
  const initialFileResult = await initialMarkdownFileFromArguments()
  createWindow(initialFileResult)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
