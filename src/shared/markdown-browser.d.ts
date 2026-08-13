type FileSystemErrorCode =
  | 'ACCESS_DENIED'
  | 'INVALID_PATH'
  | 'NOT_FOUND'
  | 'NOT_A_DIRECTORY'
  | 'NOT_A_MARKDOWN_FILE'
  | 'NO_ROOT_SELECTED'
  | 'READ_FAILED'

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
  type: 'directory' | 'markdown'
}

interface InitialMarkdownFile {
  rootPath: string
  filePath: string
  name: string
  content: string
}

interface MarkdownBrowserApi {
  platform: NodeJS.Platform
  selectRootFolder: () => Promise<FileSystemResult<{ rootPath: string }>>
  listDirectory: (directoryPath?: string) => Promise<FileSystemResult<DirectoryEntry[]>>
  readMarkdownFile: (filePath: string) => Promise<FileSystemResult<{ content: string }>>
  consumeInitialMarkdownFile: () => Promise<FileSystemResult<InitialMarkdownFile | null>>
}

interface Window {
  markdownBrowser: MarkdownBrowserApi
}
