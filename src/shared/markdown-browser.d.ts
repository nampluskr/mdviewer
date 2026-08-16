type FileSystemErrorCode =
  | 'ACCESS_DENIED'
  | 'BINARY_FILE'
  | 'CANCELLED'
  | 'FILE_TOO_LARGE'
  | 'INVALID_PATH'
  | 'NOT_FOUND'
  | 'NOT_A_DIRECTORY'
  | 'NO_ROOT_SELECTED'
  | 'READ_FAILED'
  | 'OUTSIDE_ROOT'
  | 'ROOT_UNAVAILABLE'
  | 'UNSUPPORTED_ENCODING'
  | 'UNSUPPORTED_TYPE'

interface FileSystemError {
  code: FileSystemErrorCode
  message: string
}

interface FileSystemSuccess<T> {
  ok: true
  value: T
}

interface FileSystemFailure {
  ok: false
  error: FileSystemError
}

type FileSystemResult<T> = FileSystemSuccess<T> | FileSystemFailure

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
  size: number
  createdAtMs: number
}

interface MarkdownBrowserApi {
  platform: NodeJS.Platform
  selectRootFolder: () => Promise<FileSystemResult<{ rootPath: string }>>
  listDirectory: (directoryPath?: string) => Promise<FileSystemResult<DirectoryEntry[]>>
  readFile: (filePath: string) => Promise<FileSystemResult<{ content: string; kind: 'markdown' | 'text' | 'code'; language: string | null; size: number; createdAtMs: number }>>
  resolveRelativeResource: (baseFilePath: string, relativePath: string, expectedType: 'image' | 'markdown') => Promise<FileSystemResult<{ path: string }>>
  writeClipboardText: (text: string) => Promise<FileSystemResult<null>>
  consumeInitialMarkdownFile: () => Promise<FileSystemResult<InitialMarkdownFile | null>>
  openExternalLink: (url: string) => Promise<FileSystemResult<null>>
  windowMinimize: () => Promise<void>
  windowToggleMaximize: () => Promise<void>
  windowClose: () => Promise<void>
  windowIsMaximized: () => Promise<boolean>
  onWindowMaximizeChange: (callback: (isMaximized: boolean) => void) => () => void
}

interface Window {
  markdownBrowser: MarkdownBrowserApi
}

declare const __APP_NAME__: string
declare const __APP_VERSION__: string
declare const __BUILD_DATE__: string
