import { app, BrowserWindow, dialog, ipcMain, session, shell } from 'electron'
import type { OpenDialogOptions } from 'electron'
import { promises as fs } from 'node:fs'
import { dirname, isAbsolute, join, resolve } from 'node:path'
import { is } from '@electron-toolkit/utils'
import { isWithinRoot } from './filesystem-boundary'
import { classifySupportedFile, isSupportedImage } from './file-classification'
import { decodeUtf8, MAX_TEXT_FILE_BYTES } from './text-file-content'

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
  | 'BINARY_FILE'
  | 'FILE_TOO_LARGE'
  | 'INVALID_PATH'
  | 'NOT_FOUND'
  | 'NOT_A_DIRECTORY'
  | 'OUTSIDE_ROOT'
  | 'ROOT_UNAVAILABLE'
  | 'UNSUPPORTED_ENCODING'
  | 'UNSUPPORTED_TYPE'
  | 'NO_ROOT_SELECTED'
  | 'READ_FAILED'

type FileSystemResult<T> = { ok: true; value: T } | { ok: false; error: { code: FileSystemErrorCode; message: string } }

interface DirectoryEntry {
  name: string
  path: string
  type: 'directory' | 'markdown' | 'text' | 'code'
  language?: string | null
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
    return failed('OUTSIDE_ROOT', 'The requested path is outside the selected root folder.')
  }

  try {
    const realRootPath = await fs.realpath(rootPath)
    const realPath = await fs.realpath(absolutePath)
    if (!isWithinRoot(realRootPath, realPath)) {
      return failed('OUTSIDE_ROOT', 'The requested path resolves outside the selected root folder.')
    }
    return succeeded(realPath)
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === 'ENOENT') {
      try {
        await fs.realpath(rootPath)
      } catch {
        return failed('ROOT_UNAVAILABLE', 'The selected root folder is unavailable.')
      }
    }
    return errorResult(error, 'INVALID_PATH', 'The requested path is invalid.')
  }
}

async function resolveRelativePathWithinRoot(
  rootPath: string,
  baseFilePath: string,
  relativePath: string,
  expectedType: 'image' | 'markdown'
): Promise<FileSystemResult<{ path: string }>> {
  if (typeof relativePath !== 'string' || relativePath.length === 0 || isAbsolute(relativePath)) {
    return failed('INVALID_PATH', 'A relative path is required.')
  }
  if (expectedType === 'image' ? !isSupportedImage(relativePath) : classifySupportedFile(relativePath)?.kind !== 'markdown') {
    return failed('UNSUPPORTED_TYPE', 'The requested resource type is not supported.')
  }

  const baseFile = await resolvePathWithinRoot(rootPath, baseFilePath)
  if (!baseFile.ok) return baseFile
  const candidatePath = resolve(dirname(baseFile.value), relativePath)
  if (!isWithinRoot(rootPath, candidatePath)) return failed('OUTSIDE_ROOT', 'The requested path is outside the selected root folder.')

  try {
    const realRootPath = await fs.realpath(rootPath)
    const realPath = await fs.realpath(candidatePath)
    if (!isWithinRoot(realRootPath, realPath)) return failed('OUTSIDE_ROOT', 'The requested path resolves outside the selected root folder.')
    const stats = await fs.stat(realPath)
    if (!stats.isFile()) return failed('UNSUPPORTED_TYPE', 'The requested resource is not a file.')
    return succeeded({ path: realPath })
  } catch (error) {
    return errorResult(error, 'READ_FAILED', 'Unable to resolve the requested resource.')
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
      return failed('UNSUPPORTED_TYPE', 'The launch argument is not a Markdown file.')
    }
    if (stats.size > MAX_TEXT_FILE_BYTES) {
      return failed('FILE_TOO_LARGE', 'The requested file exceeds the 10 MiB size limit.')
    }
    const decoded = decodeUtf8(await fs.readFile(filePath))
    if (!decoded.ok) return failed(decoded.code, decoded.message)

    const rootPath = await fs.realpath(dirname(filePath))
    return succeeded({
      rootPath,
      filePath,
      name: filePath.split(/[\\/]/).filter(Boolean).pop() ?? filePath,
      content: decoded.value
    })
  } catch (error) {
    return errorResult(error, 'READ_FAILED', 'Unable to open the requested Markdown file.')
  }
}

function registerFileSystemHandlers(): void {
  ipcMain.handle('shell:open-external-link', async (_event, url: string): Promise<FileSystemResult<null>> => {
    if (typeof url !== 'string') return failed('INVALID_PATH', 'A valid URL is required.')

    try {
      const destination = new URL(url)
      if (destination.protocol !== 'https:' && destination.protocol !== 'http:') {
        return failed('INVALID_PATH', 'Only HTTP and HTTPS links can be opened.')
      }
      await shell.openExternal(destination.toString())
      return succeeded(null)
    } catch {
      return failed('INVALID_PATH', 'The link URL is invalid.')
    }
  })

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
        const fileType = classifySupportedFile(entry.name)
        if (entryStats.isFile() && fileType) {
          visibleEntries.push({ name: entry.name, path: resolvedEntry.value, type: fileType.kind, language: fileType.language })
        }
      }

      visibleEntries.sort((left, right) => left.type.localeCompare(right.type) || left.name.localeCompare(right.name))
      if (skippedUnsafeEntry) {
        return failed('OUTSIDE_ROOT', 'Some folder entries were excluded because they resolve outside the selected root folder.')
      }
      return succeeded(visibleEntries)
    } catch (error) {
      return errorResult(error, 'READ_FAILED', 'Unable to list the requested folder.')
    }
  })

  ipcMain.handle('filesystem:read-file', async (event, filePath: string): Promise<FileSystemResult<{ content: string; kind: 'markdown' | 'text' | 'code'; language: string | null }>> => {
    const root = rootForSender(event.sender.id)
    if (!root.ok) return root
    const target = await resolvePathWithinRoot(root.value, filePath)
    if (!target.ok) return target
    const fileType = classifySupportedFile(target.value)
    if (!fileType) return failed('UNSUPPORTED_TYPE', 'This file type is not supported.')

    try {
      const stats = await fs.stat(target.value)
      if (!stats.isFile()) return failed('UNSUPPORTED_TYPE', 'Only supported files can be opened.')
      if (stats.size > MAX_TEXT_FILE_BYTES) {
        return failed('FILE_TOO_LARGE', 'The requested file exceeds the 10 MiB size limit.')
      }
      const decoded = decodeUtf8(await fs.readFile(target.value))
      if (!decoded.ok) return failed(decoded.code, decoded.message)
      return succeeded({ content: decoded.value, kind: fileType.kind, language: fileType.language })
    } catch (error) {
      return errorResult(error, 'READ_FAILED', 'Unable to read the requested Markdown file.')
    }
  })

  ipcMain.handle('filesystem:resolve-relative-resource', async (
    event,
    baseFilePath: string,
    relativePath: string,
    expectedType: 'image' | 'markdown'
  ): Promise<FileSystemResult<{ path: string }>> => {
    const root = rootForSender(event.sender.id)
    if (!root.ok) return root
    if (expectedType !== 'image' && expectedType !== 'markdown') return failed('INVALID_PATH', 'A valid resource type is required.')
    return resolveRelativePathWithinRoot(root.value, baseFilePath, relativePath, expectedType)
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

  window.setMenuBarVisibility(false)
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
