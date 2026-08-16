import { Component, isValidElement, useEffect, useRef, useState } from 'react'
import type { ErrorInfo, ReactElement, ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { CodePanel } from './CodePanel'

interface Tab {
  id: string
  filePath: string | null
  title: string
  content: string
  error: string | null
  kind: 'empty' | 'markdown' | 'text' | 'code'
  language: string | null
  size: number | null
  createdAtMs: number | null
}

interface DirectoryState {
  entries: DirectoryEntry[]
  error: string | null
  loading: boolean
}

interface MarkdownErrorBoundaryProps {
  children: ReactNode
}

interface MarkdownErrorBoundaryState {
  hasError: boolean
}

class MarkdownErrorBoundary extends Component<MarkdownErrorBoundaryProps, MarkdownErrorBoundaryState> {
  state: MarkdownErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): MarkdownErrorBoundaryState {
    return { hasError: true }
  }

  componentDidUpdate(previousProps: MarkdownErrorBoundaryProps): void {
    if (previousProps.children !== this.props.children && this.state.hasError) {
      this.setState({ hasError: false })
    }
  }

  componentDidCatch(_error: Error, _errorInfo: ErrorInfo): void {
    // Keep renderer failures isolated to the active Markdown document.
  }

  render(): ReactNode {
    if (this.state.hasError) return <p className="document-error" role="alert">Unable to render this Markdown file.</p>
    return this.props.children
  }
}

const DEFAULT_CONTENT_FONT_SCALE = 90

function nextTheme(theme: 'light' | 'dim' | 'dark'): 'light' | 'dim' | 'dark' {
  if (theme === 'light') return 'dim'
  if (theme === 'dim') return 'dark'
  return 'light'
}

function fileName(path: string): string {
  return path.split(/[\\/]/).filter(Boolean).pop() ?? path
}

function parentDirectory(path: string): string | null {
  const normalized = path.replace(/[\\/]+$/, '')
  const separatorIndex = Math.max(normalized.lastIndexOf('\\'), normalized.lastIndexOf('/'))
  if (separatorIndex < 0) return null
  return normalized.slice(0, separatorIndex) || null
}

function sameFilePath(left: string | null, right: string, platform: NodeJS.Platform): boolean {
  return left !== null && (platform === 'win32' ? left.toLowerCase() === right.toLowerCase() : left === right)
}

function relativeDirectoryPath(rootPath: string, currentDirectoryPath: string, platform: NodeJS.Platform): string {
  const normalizedRoot = rootPath.replace(/[\\/]+$/, '')
  const compareRoot = platform === 'win32' ? normalizedRoot.toLowerCase() : normalizedRoot
  const compareCurrent = platform === 'win32' ? currentDirectoryPath.toLowerCase() : currentDirectoryPath
  if (!compareCurrent.startsWith(compareRoot)) return ''
  const rest = currentDirectoryPath.slice(normalizedRoot.length)
  if (rest.length > 0 && !/^[\\/]/.test(rest)) return ''
  return rest.replace(/^[\\/]+/, '')
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unitIndex]}`
}

function formatCreatedDate(createdAtMs: number): string | null {
  if (!Number.isFinite(createdAtMs) || createdAtMs <= 0) return null
  const date = new Date(createdAtMs)
  if (Number.isNaN(date.getTime())) return null
  const year = String(date.getFullYear())
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatStatusBar(tab: Tab | null): string {
  if (!tab?.filePath) return 'No file path'
  const parts = [tab.filePath]
  if (tab.size !== null) parts.push(formatFileSize(tab.size))
  const createdDate = tab.createdAtMs !== null ? formatCreatedDate(tab.createdAtMs) : null
  if (createdDate) parts.push(createdDate)
  return parts.join(' | ')
}

function EntryIcon({ type }: { type: DirectoryEntry['type'] }): ReactElement {
  if (type === 'directory') {
    return (
      <svg className="entry-icon" viewBox="0 0 16 16" aria-hidden="true">
        <path d="M1.5 4.2a1 1 0 0 1 1-1h3.1l1.1 1.3h6.8a1 1 0 0 1 1 1v6.3a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1V4.2z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      </svg>
    )
  }
  return (
    <svg className="entry-icon" viewBox="0 0 16 16" aria-hidden="true">
      <rect x="2.5" y="1.5" width="11" height="13" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.3" />
      {type === 'markdown' ? (
        <text x="8" y="11" textAnchor="middle" fontSize="7" fontWeight="700" fill="currentColor">M</text>
      ) : type === 'code' ? (
        <text x="8" y="10.3" textAnchor="middle" fontSize="5.5" fontWeight="700" fill="currentColor">{'</>'}</text>
      ) : type === 'text' ? (
        <>
          <line x1="4.5" y1="6" x2="11.5" y2="6" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
          <line x1="4.5" y1="9" x2="11.5" y2="9" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
          <line x1="4.5" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
        </>
      ) : null}
    </svg>
  )
}

function ExplorerToggleIcon({ visible }: { visible: boolean }): ReactElement {
  return (
    <svg className="toolbar-icon" viewBox="0 0 16 16" aria-hidden="true">
      <rect x="1.5" y="2.5" width="13" height="11" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <line x1="6" y1="2.5" x2="6" y2="13.5" stroke="currentColor" strokeWidth="1.3" />
      {visible ? <rect x="1.5" y="2.5" width="4.5" height="11" rx="1" fill="currentColor" stroke="none" /> : null}
    </svg>
  )
}

function PlusIcon(): ReactElement {
  return (
    <svg className="toolbar-icon" viewBox="0 0 16 16" aria-hidden="true">
      <line x1="8" y1="2" x2="8" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="2" y1="8" x2="14" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function RootHomeIcon(): ReactElement {
  return (
    <svg className="toolbar-icon" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M2 8.5 8 3l6 5.5" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3.5 7.5V13a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V7.5" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function OpenFolderIcon(): ReactElement {
  return (
    <svg className="toolbar-icon" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M1.5 4.2a1 1 0 0 1 1-1h3.1l1.1 1.3h6.8a1 1 0 0 1 1 1v6.3a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1V4.2z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  )
}

function MarkdownFilterIcon({ active }: { active: boolean }): ReactElement {
  return (
    <svg className="toolbar-icon" viewBox="0 0 16 16" aria-hidden="true">
      <rect x="2.5" y="1.5" width="11" height="13" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.3" />
      {active ? (
        <text x="8" y="11" textAnchor="middle" fontSize="7" fontWeight="700" fill="currentColor">M</text>
      ) : (
        <>
          <line x1="4.5" y1="6" x2="11.5" y2="6" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
          <line x1="4.5" y1="9" x2="11.5" y2="9" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
          <line x1="4.5" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
        </>
      )}
    </svg>
  )
}

function ReloadIcon(): ReactElement {
  return (
    <svg className="toolbar-icon" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M13 5.2A5.5 5.5 0 1 0 13.8 9" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M13.2 2.3v3.2h-3.2" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ZoomOutIcon(): ReactElement {
  return (
    <svg className="toolbar-icon" viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="6.8" cy="6.8" r="4.6" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <line x1="10.2" y1="10.2" x2="14.2" y2="14.2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <line x1="4.5" y1="6.8" x2="9.1" y2="6.8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function ZoomInIcon(): ReactElement {
  return (
    <svg className="toolbar-icon" viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="6.8" cy="6.8" r="4.6" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <line x1="10.2" y1="10.2" x2="14.2" y2="14.2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <line x1="4.5" y1="6.8" x2="9.1" y2="6.8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="6.8" y1="4.5" x2="6.8" y2="9.1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function ThemeIcon({ theme }: { theme: 'light' | 'dim' | 'dark' }): ReactElement {
  if (theme === 'dark') {
    return (
      <svg className="toolbar-icon" viewBox="0 0 16 16" aria-hidden="true">
        <path d="M13.3 9.7A5.3 5.3 0 0 1 6.7 3a4.3 4.3 0 1 0 6.6 6.7z" fill="currentColor" stroke="none" />
      </svg>
    )
  }
  if (theme === 'dim') {
    return (
      <svg className="toolbar-icon" viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="8" cy="8" r="5.3" fill="none" stroke="currentColor" strokeWidth="1.3" />
        <path d="M8 2.7a5.3 5.3 0 0 1 0 10.6z" fill="currentColor" stroke="none" />
      </svg>
    )
  }
  return (
    <svg className="toolbar-icon" viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="3" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <g stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
        <line x1="8" y1="1.4" x2="8" y2="3" />
        <line x1="8" y1="13" x2="8" y2="14.6" />
        <line x1="1.4" y1="8" x2="3" y2="8" />
        <line x1="13" y1="8" x2="14.6" y2="8" />
        <line x1="3.3" y1="3.3" x2="4.4" y2="4.4" />
        <line x1="11.6" y1="11.6" x2="12.7" y2="12.7" />
        <line x1="3.3" y1="12.7" x2="4.4" y2="11.6" />
        <line x1="11.6" y1="4.4" x2="12.7" y2="3.3" />
      </g>
    </svg>
  )
}

async function openExternalLink(url: string): Promise<FileSystemResult<null> | null> {
  if (!window.markdownBrowser) return null
  return window.markdownBrowser.openExternalLink(url)
}

function isRelativePath(value: string): boolean {
  return value.length > 0 && !value.startsWith('#') && !value.startsWith('/') && !/^[a-z][a-z\d+.-]*:/i.test(value)
}

function fileUrl(path: string): string {
  const normalized = path.replace(/\\/g, '/')
  return `file:///${normalized.split('/').map((segment, index) => (
    index === 0 && /^[a-z]:$/i.test(segment) ? segment : encodeURIComponent(segment)
  )).join('/')}`
}

function LocalImage({ alt, baseFilePath, source }: { alt?: string; baseFilePath: string; source?: string }): ReactElement {
  const [state, setState] = useState<{ source: string | null; error: string | null }>({ source: null, error: null })

  useEffect(() => {
    let active = true
    if (!source || !isRelativePath(source)) {
      setState({ source: null, error: 'Local images must use a relative supported path.' })
      return () => { active = false }
    }

    void window.markdownBrowser.resolveRelativeResource(baseFilePath, source, 'image').then((result) => {
      if (!active) return
      setState(result.ok ? { source: fileUrl(result.value.path), error: null } : { source: null, error: result.error.message })
    }).catch(() => {
      if (active) setState({ source: null, error: 'Unable to load the local image.' })
    })
    return () => { active = false }
  }, [baseFilePath, source])

  if (!state.source) return <span className="markdown-image-error" role="status">{alt ?? 'Image'}: {state.error ?? 'Loading image...'}</span>
  return <img src={state.source} alt={alt ?? ''} />
}

function App(): ReactElement {
  const platform = window.markdownBrowser?.platform
  const [rootPath, setRootPath] = useState<string | null>(null)
  const [currentDirectoryPath, setCurrentDirectoryPath] = useState<string | null>(null)
  const [explorerVisible, setExplorerVisible] = useState(true)
  const [explorerWidth, setExplorerWidth] = useState(192)
  const [theme, setTheme] = useState<'light' | 'dim' | 'dark'>('light')
  const [contentFontScale, setContentFontScale] = useState(DEFAULT_CONTENT_FONT_SCALE)
  const [focusMode, setFocusMode] = useState(false)
  const [resizingExplorer, setResizingExplorer] = useState(false)
  const [tabs, setTabs] = useState<Tab[]>([])
  const [activeTabId, setActiveTabId] = useState<string | null>(null)
  const [directory, setDirectory] = useState<DirectoryState>({ entries: [], error: null, loading: false })
  const [selectedEntryIndex, setSelectedEntryIndex] = useState(0)
  const [explorerHasFocus, setExplorerHasFocus] = useState(false)
  const [markdownOnly, setMarkdownOnly] = useState(true)
  const [folderError, setFolderError] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [launchError, setLaunchError] = useState<string | null>(null)
  const [initialLaunchPending, setInitialLaunchPending] = useState(true)
  const nextTabNumber = useRef(1)
  const fileLoadVersions = useRef(new Map<string, number>())
  const tabsRef = useRef<Tab[]>([])
  const activeTabIdRef = useRef<string | null>(null)
  const tabButtonRefs = useRef(new Map<string, HTMLButtonElement>())
  const hasUserChangedState = useRef(false)
  const directoryLoadVersion = useRef(0)
  const reloadVersion = useRef(0)
  const explorerEntryRefs = useRef(new Map<number, HTMLButtonElement>())
  const parentButtonRef = useRef<HTMLButtonElement | null>(null)
  const explorerRef = useRef<HTMLElement | null>(null)
  const restoreExplorerFocus = useRef(false)

  useEffect(() => {
    const loadInitialMarkdownFile = async (): Promise<void> => {
      if (!window.markdownBrowser) return

      try {
        const result = await window.markdownBrowser.consumeInitialMarkdownFile()
        if (!result.ok) {
          setLaunchError(result.error.message)
          return
        }
        if (!result.value) return
        if (hasUserChangedState.current) return

        const initialFile = result.value
        setRootPath(initialFile.rootPath)
        setCurrentDirectoryPath(initialFile.rootPath)
        setFileError(null)
        setTabs([{ id: 'launch-0', filePath: initialFile.filePath, title: initialFile.name, content: initialFile.content, error: null, kind: 'markdown', language: null, size: initialFile.size, createdAtMs: initialFile.createdAtMs }])
        setActiveTabId('launch-0')
        await loadDirectory(initialFile.rootPath)
      } catch {
        setLaunchError('Unable to initialize the requested Markdown file.')
      } finally {
        setInitialLaunchPending(false)
      }
    }

    void loadInitialMarkdownFile()
  }, [])

  useEffect(() => {
    tabsRef.current = tabs
  }, [tabs])

  useEffect(() => {
    activeTabIdRef.current = activeTabId
    if (activeTabId) tabButtonRefs.current.get(activeTabId)?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [activeTabId])

  // Restore Explorer focus only after the new listing is committed and its refs are attached.
  useEffect(() => {
    if (directory.loading || !restoreExplorerFocus.current) return
    restoreExplorerFocus.current = false
    const usableParentButton = parentButtonRef.current && !parentButtonRef.current.disabled ? parentButtonRef.current : null
    const target = explorerEntryRefs.current.get(0) ?? usableParentButton ?? explorerRef.current
    target?.focus()
  }, [directory])

  const switchTab = (direction: 1 | -1): void => {
    const currentTabs = tabsRef.current
    if (currentTabs.length < 2) return
    const currentIndex = currentTabs.findIndex((tab) => tab.id === activeTabIdRef.current)
    const startIndex = currentIndex >= 0 ? currentIndex : 0
    const nextIndex = (startIndex + direction + currentTabs.length) % currentTabs.length
    setActiveTabId(currentTabs[nextIndex].id)
    setFileError(null)
  }

  const adjustContentFontScale = (amount: number): void => {
    setContentFontScale((scale) => Math.min(200, Math.max(80, scale + amount)))
  }

  const reloadCurrentState = async (): Promise<void> => {
    if (!window.markdownBrowser || !rootPath || !currentDirectoryPath) return

    const version = reloadVersion.current + 1
    reloadVersion.current = version
    const directoryPath = currentDirectoryPath
    const activeTab = tabsRef.current.find((tab) => tab.id === activeTabIdRef.current) ?? null
    setDirectory((current) => ({ ...current, error: null, loading: true }))

    const directoryResult = await window.markdownBrowser.listDirectory(directoryPath)
    if (reloadVersion.current !== version) return

    if (directoryResult.ok) {
      setDirectory({ entries: directoryResult.value, error: null, loading: false })
      setFolderError(null)
    } else if (directoryResult.error.code === 'ROOT_UNAVAILABLE') {
      if (activeTab) {
        setTabs((currentTabs) => currentTabs.map((tab) => (
          tab.id === activeTab.id ? { ...tab, error: directoryResult.error.message, size: null, createdAtMs: null } : tab
        )))
      }
      setRootPath(null)
      setCurrentDirectoryPath(null)
      setDirectory({ entries: [], error: null, loading: false })
      setFolderError(directoryResult.error.message)
      return
    } else if (directoryResult.error.code === 'NOT_FOUND' && !sameFilePath(directoryPath, rootPath, platform)) {
      const rootResult = await window.markdownBrowser.listDirectory(rootPath)
      if (reloadVersion.current !== version) return
      if (rootResult.ok) {
        setCurrentDirectoryPath(rootPath)
        setDirectory({ entries: rootResult.value, error: null, loading: false })
        setFolderError(`${directoryResult.error.message} Returned to the root folder.`)
      } else if (rootResult.error.code === 'ROOT_UNAVAILABLE') {
        setRootPath(null)
        setCurrentDirectoryPath(null)
        setDirectory({ entries: [], error: null, loading: false })
        setFolderError(rootResult.error.message)
        return
      } else {
        setDirectory((current) => ({ ...current, error: rootResult.error.message, loading: false }))
        setFolderError(rootResult.error.message)
      }
    } else {
      setDirectory((current) => ({ ...current, error: directoryResult.error.message, loading: false }))
      setFolderError(directoryResult.error.message)
    }

    const openFileTabs = tabsRef.current.filter((tab): tab is Tab & { filePath: string } => tab.filePath !== null)
    if (openFileTabs.length === 0) return
    const fileResults = await Promise.all(openFileTabs.map(async (tab) => {
      try {
        return { id: tab.id, result: await window.markdownBrowser.readFile(tab.filePath) }
      } catch {
        return { id: tab.id, result: { ok: false, error: { code: 'READ_FAILED', message: 'Unable to read the requested file.' } } as const }
      }
    }))
    if (reloadVersion.current !== version) return
    setTabs((currentTabs) => currentTabs.map((tab) => {
      const fileResult = fileResults.find((entry) => entry.id === tab.id)?.result
      if (!fileResult) return tab
      if (!fileResult.ok) return { ...tab, error: fileResult.error.message, size: null, createdAtMs: null }
      return {
        ...tab,
        content: fileResult.value.content,
        error: null,
        kind: fileResult.value.kind,
        language: fileResult.value.language,
        size: fileResult.value.size,
        createdAtMs: fileResult.value.createdAtMs
      }
    }))
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'F11') {
        event.preventDefault()
        setResizingExplorer(false)
        setFocusMode((enabled) => !enabled)
        return
      }
      if (event.key === 'Escape' && focusMode) {
        event.preventDefault()
        setFocusMode(false)
        return
      }
      if (event.key === 'F5' || (event.ctrlKey && !event.altKey && !event.metaKey && event.key.toLowerCase() === 'r')) {
        event.preventDefault()
        void reloadCurrentState()
        return
      }
      if (!event.ctrlKey || event.altKey || event.metaKey) return
      if (event.key.toLowerCase() === 'o') {
        event.preventDefault()
        void selectRootFolder()
      } else if (event.key.toLowerCase() === 't') {
        event.preventDefault()
        createEmptyTab()
      } else if (event.key.toLowerCase() === 'w') {
        event.preventDefault()
        if (activeTabIdRef.current) closeTab(activeTabIdRef.current)
      } else if (event.key === 'Tab') {
        event.preventDefault()
        switchTab(event.shiftKey ? -1 : 1)
      } else if (event.key === '+' || event.key === '=') {
        event.preventDefault()
        adjustContentFontScale(10)
      } else if (event.key === '-') {
        event.preventDefault()
        adjustContentFontScale(-10)
      } else if (event.key === '0') {
        event.preventDefault()
        setContentFontScale(DEFAULT_CONTENT_FONT_SCALE)
      } else if (event.key === '1') {
        event.preventDefault()
        setTheme('light')
      } else if (event.key === '2') {
        event.preventDefault()
        setTheme('dim')
      } else if (event.key === '3') {
        event.preventDefault()
        setTheme('dark')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [tabs, activeTabId, rootPath, currentDirectoryPath, focusMode])

  const createEmptyTab = (): void => {
    hasUserChangedState.current = true
    const id = `empty-${nextTabNumber.current}`
    nextTabNumber.current += 1
    setTabs((currentTabs) => [...currentTabs, { id, filePath: null, title: 'Untitled', content: '', error: null, kind: 'empty', language: null, size: null, createdAtMs: null }])
    setFileError(null)
    setActiveTabId(id)
  }

  const closeTab = (tabId: string): void => {
    const currentTabs = tabsRef.current
    const closingIndex = currentTabs.findIndex((tab) => tab.id === tabId)
    const remainingTabs = currentTabs.filter((tab) => tab.id !== tabId)
    tabsRef.current = remainingTabs
    if (tabId === activeTabIdRef.current) {
      const nextActiveTab = remainingTabs[closingIndex] ?? remainingTabs[closingIndex - 1] ?? null
      setActiveTabId(nextActiveTab?.id ?? null)
    }

    fileLoadVersions.current.delete(tabId)
    setFileError(null)
    setTabs(remainingTabs)
  }

  const activateTab = (tabId: string): void => {
    setFileError(null)
    setActiveTabId(tabId)
  }

  const loadDirectory = async (directoryPath: string): Promise<void> => {
    if (!window.markdownBrowser) return

    reloadVersion.current += 1
    const loadVersion = directoryLoadVersion.current + 1
    directoryLoadVersion.current = loadVersion
    setDirectory((current) => ({ ...current, error: null, loading: true }))
    const result = await window.markdownBrowser.listDirectory(directoryPath)
    if (directoryLoadVersion.current !== loadVersion) return
    setDirectory(result.ok
      ? { entries: result.value, error: null, loading: false }
      : { entries: [], error: result.error.message, loading: false })
    setSelectedEntryIndex(0)
    if (!result.ok) setFolderError(result.error.message)
  }

  const selectRootFolder = async (): Promise<void> => {
    if (!window.markdownBrowser) return
    hasUserChangedState.current = true

    try {
      const result = await window.markdownBrowser.selectRootFolder()
      if (!result.ok) {
        if (result.error.code !== 'CANCELLED') setFolderError(result.error.message)
        return
      }

      setRootPath(result.value.rootPath)
      setCurrentDirectoryPath(result.value.rootPath)
      setFileError(null)
      setFolderError(null)
      await loadDirectory(result.value.rootPath)
    } catch {
      setFolderError('Unable to select a root folder.')
    }
  }

  const navigateToDirectory = (directoryPath: string): void => {
    restoreExplorerFocus.current = true
    setCurrentDirectoryPath(directoryPath)
    setFolderError(null)
    void loadDirectory(directoryPath)
  }

  const openFilePath = async (filePath: string, name: string): Promise<void> => {
    if (!window.markdownBrowser) return
    const alreadyOpen = tabsRef.current.find((tab) => sameFilePath(tab.filePath, filePath, platform))
    if (alreadyOpen) {
      setFileError(null)
      setActiveTabId(alreadyOpen.id)
      return
    }

    const targetTabId = activeTabId
    const loadVersionKey = filePath
    const loadVersion = (fileLoadVersions.current.get(loadVersionKey) ?? 0) + 1
    fileLoadVersions.current.set(loadVersionKey, loadVersion)
    setFileError(null)
    const result = await window.markdownBrowser.readFile(filePath)
    if (fileLoadVersions.current.get(loadVersionKey) !== loadVersion) return
    fileLoadVersions.current.delete(loadVersionKey)
    if (!result.ok) {
      setFileError(result.error.message)
      return
    }

    const existingAfterRead = tabsRef.current.find((tab) => sameFilePath(tab.filePath, filePath, platform))
    if (existingAfterRead) {
      if (activeTabIdRef.current === targetTabId || activeTabIdRef.current === null) setActiveTabId(existingAfterRead.id)
      return
    }
    const fileTab: Tab = {
      id: `file-${nextTabNumber.current}`,
      filePath,
      title: name,
      content: result.value.content,
      error: null,
      kind: result.value.kind,
      language: result.value.language,
      size: result.value.size,
      createdAtMs: result.value.createdAtMs
    }
    nextTabNumber.current += 1

    const targetIsEmpty = targetTabId !== null && tabsRef.current.some((tab) => tab.id === targetTabId && tab.kind === 'empty')
    if (targetIsEmpty && targetTabId) {
      setTabs((currentTabs) => currentTabs.map((tab) => (
        tab.id === targetTabId ? { ...fileTab, id: targetTabId } : tab
      )))
      if (activeTabIdRef.current === targetTabId) setActiveTabId(targetTabId)
    } else {
      setTabs((currentTabs) => [...currentTabs, fileTab])
      if (activeTabIdRef.current === targetTabId || activeTabIdRef.current === null) setActiveTabId(fileTab.id)
    }
  }

  const openFile = (entry: DirectoryEntry): Promise<void> => openFilePath(entry.path, entry.name)

  const openMarkdownLink = async (baseFilePath: string, href: string): Promise<void> => {
    if (!isRelativePath(href)) {
      const externalResult = await openExternalLink(href)
      if (externalResult && !externalResult.ok) setFileError(externalResult.error.message)
      return
    }
    const relativePath = href.split(/[?#]/)[0]
    const result = await window.markdownBrowser.resolveRelativeResource(baseFilePath, relativePath, 'markdown')
    if (!result.ok) {
      setFileError(result.error.message)
      return
    }
    await openFilePath(result.value.path, fileName(result.value.path))
  }

  const visibleEntries = markdownOnly
    ? directory.entries.filter((entry) => entry.type === 'directory' || entry.type === 'markdown')
    : directory.entries

  const activateExplorerEntry = (index: number): void => {
    const entry = visibleEntries[index]
    if (!entry) return
    if (entry.type === 'directory') navigateToDirectory(entry.path)
    else void openFile(entry)
  }

  const handleExplorerKeyDown = (event: React.KeyboardEvent<HTMLElement>): void => {
    if (!rootPath || !currentDirectoryPath) return
    // The handler is bound to the Explorer aside, so any event here already originates inside it.
    const target = event.target instanceof HTMLElement ? event.target : null
    const maximumIndex = visibleEntries.length - 1
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (maximumIndex < 0) return
      event.preventDefault()
      const nextIndex = event.key === 'ArrowDown'
        ? Math.min(selectedEntryIndex + 1, maximumIndex)
        : Math.max(selectedEntryIndex - 1, 0)
      setSelectedEntryIndex(nextIndex)
      explorerEntryRefs.current.get(nextIndex)?.focus()
      return
    }
    if (event.key === 'Home' || event.key === 'End') {
      if (maximumIndex < 0) return
      event.preventDefault()
      const nextIndex = event.key === 'Home' ? 0 : maximumIndex
      setSelectedEntryIndex(nextIndex)
      explorerEntryRefs.current.get(nextIndex)?.focus()
      return
    }
    if ((event.key === 'ArrowLeft' || event.key === 'Backspace') && !sameFilePath(currentDirectoryPath, rootPath, platform)) {
      event.preventDefault()
      const parent = parentDirectory(currentDirectoryPath)
      if (parent) navigateToDirectory(parent)
      return
    }
    if (event.key === 'ArrowRight' || event.key === 'Enter') {
      // Let buttons that are not entry rows (".." and header controls) run their own click action.
      if (target !== null && target.tagName === 'BUTTON' && !target.classList.contains('explorer-file') && !target.classList.contains('explorer-directory')) return
      event.preventDefault()
      activateExplorerEntry(selectedEntryIndex)
    }
  }

  const startExplorerResize = (event: React.PointerEvent<HTMLDivElement>): void => {
    event.currentTarget.setPointerCapture(event.pointerId)
    setResizingExplorer(true)
  }

  const resizeExplorer = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (!resizingExplorer) return
    const minimumWidth = 192
    const maximumWidth = Math.max(minimumWidth, Math.floor(window.innerWidth * 0.45))
    setExplorerWidth(Math.min(Math.max(event.clientX, minimumWidth), maximumWidth))
  }

  const stopExplorerResize = (): void => setResizingExplorer(false)

  const handleContentWheel = (event: React.WheelEvent<HTMLDivElement>): void => {
    if (!event.ctrlKey) return
    event.preventDefault()
    adjustContentFontScale(event.deltaY < 0 ? 10 : -10)
  }

  const adjustExplorerWidth = (amount: number): void => {
    const minimumWidth = 192
    const maximumWidth = Math.max(minimumWidth, Math.floor(window.innerWidth * 0.45))
    setExplorerWidth((width) => Math.min(Math.max(width + amount, minimumWidth), maximumWidth))
  }

  useEffect(() => {
    const clampExplorerWidth = (): void => adjustExplorerWidth(0)
    window.addEventListener('resize', clampExplorerWidth)
    return () => window.removeEventListener('resize', clampExplorerWidth)
  }, [])

  if (!platform) {
    return (
      <main className="app-shell" role="alert">
        <h1>Markdown Browser failed to start</h1>
        <p>The secure preload bridge is unavailable.</p>
      </main>
    )
  }

  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? null

  return (
    <main className={`${resizingExplorer ? 'app-shell is-resizing' : 'app-shell'}${focusMode ? ' is-focus-mode' : ''}`} data-theme={theme}>
      <header className="tab-bar" aria-label="Open documents">
        <button className="toolbar-button toolbar-icon-button" type="button" tabIndex={-1} aria-pressed={explorerVisible} aria-label={explorerVisible ? 'Hide Explorer' : 'Show Explorer'} title={explorerVisible ? 'Hide Explorer' : 'Show Explorer'} onClick={() => setExplorerVisible((visible) => !visible)}>
          <ExplorerToggleIcon visible={explorerVisible} />
        </button>
        <div className="tab-list" role="tablist">
          {tabs.map((tab) => (
            <div key={tab.id} className={tab.id === activeTabId ? 'tab is-active' : 'tab'}>
              <button ref={(element) => { if (element) tabButtonRefs.current.set(tab.id, element); else tabButtonRefs.current.delete(tab.id) }} className="tab-button" type="button" role="tab" tabIndex={-1} aria-selected={tab.id === activeTabId} onClick={() => activateTab(tab.id)}>
                {tab.title}
              </button>
              <button className="tab-close-button" type="button" tabIndex={-1} aria-label={`Close ${tab.title}`} onClick={() => closeTab(tab.id)}>×</button>
            </div>
          ))}
        </div>
        <button className="toolbar-button toolbar-icon-button" type="button" tabIndex={-1} aria-label="Zoom out (Ctrl+-)" title="Zoom out (Ctrl+-)" onClick={() => adjustContentFontScale(-10)}><ZoomOutIcon /></button>
        <button className="toolbar-button toolbar-icon-button" type="button" tabIndex={-1} aria-label="Zoom in (Ctrl++)" title="Zoom in (Ctrl++)" onClick={() => adjustContentFontScale(10)}><ZoomInIcon /></button>
        <button className="toolbar-button toolbar-icon-button" type="button" tabIndex={-1} aria-label={`Theme: ${theme}. Switch to ${nextTheme(theme)} theme`} title={`Theme: ${theme}. Switch to ${nextTheme(theme)} theme`} onClick={() => setTheme(nextTheme)}><ThemeIcon theme={theme} /></button>
        <button className="new-tab-button tab-add-button toolbar-icon-button" type="button" tabIndex={-1} onClick={createEmptyTab} aria-label="Create a new tab" title="Create a new tab"><PlusIcon /></button>
      </header>
      <section className="document-area" role="tabpanel">
        {explorerVisible ? (
          <>
          <aside ref={explorerRef} className={`explorer${explorerHasFocus ? ' is-focused' : ''}${visibleEntries.length === 0 ? ' is-empty' : ''}`} style={{ width: explorerWidth, flexBasis: explorerWidth }} aria-label="Explorer" tabIndex={0} onKeyDown={handleExplorerKeyDown} onFocus={() => setExplorerHasFocus(true)} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setExplorerHasFocus(false) }}>
            <div className="explorer-header">
              <button className="explorer-header-button toolbar-icon-button" type="button" tabIndex={-1} aria-pressed={markdownOnly} aria-label={markdownOnly ? 'Show all supported files' : 'Show Markdown files only'} title={markdownOnly ? 'Show all supported files' : 'Show Markdown files only'} onClick={() => { setMarkdownOnly((value) => !value); setSelectedEntryIndex(0) }}>
                <MarkdownFilterIcon active={markdownOnly} />
              </button>
              <div className="explorer-header-actions">
                <button className="explorer-header-button toolbar-icon-button" type="button" tabIndex={-1} onClick={() => void selectRootFolder()} aria-label="Open Folder (Ctrl+O)" title="Open Folder (Ctrl+O)"><OpenFolderIcon /></button>
                <button className="explorer-header-button toolbar-icon-button" type="button" tabIndex={-1} disabled={!rootPath || !currentDirectoryPath || directory.loading} onClick={() => void reloadCurrentState()} aria-label="Reload current folder (F5)" title="Reload current folder (F5)"><ReloadIcon /></button>
              </div>
            </div>
            {folderError ? <p className="explorer-error" role="alert">{folderError}</p> : null}
            {rootPath ? (
              <p className="root-name" title={rootPath}>
                <button className="root-home-button" type="button" tabIndex={-1} disabled={sameFilePath(currentDirectoryPath, rootPath, platform)} onClick={() => navigateToDirectory(rootPath)} aria-label="Go to root folder" title="Go to root folder">
                  <RootHomeIcon />
                </button>
                <span className="root-name-text">{fileName(rootPath)}</span>
              </p>
            ) : <p className="explorer-status">Select a folder to browse supported files.</p>}
            {rootPath && currentDirectoryPath && !sameFilePath(currentDirectoryPath, rootPath, platform) ? (
              <p className="current-directory" title={currentDirectoryPath}>{relativeDirectoryPath(rootPath, currentDirectoryPath, platform)}</p>
            ) : null}
            {rootPath && currentDirectoryPath ? (
              <>
                <ul className="explorer-tree" aria-label="Current folder contents">
                  <li>
                    <button ref={parentButtonRef} className="explorer-parent" type="button" tabIndex={-1} disabled={sameFilePath(currentDirectoryPath, rootPath, platform)} onClick={() => {
                      if (sameFilePath(currentDirectoryPath, rootPath, platform)) return
                      const parent = parentDirectory(currentDirectoryPath)
                      if (parent) navigateToDirectory(parent)
                    }}>..</button>
                  </li>
                  {visibleEntries.map((entry, index) => (
                    <li key={entry.path}>
                      <button
                        ref={(element) => { if (element) explorerEntryRefs.current.set(index, element); else explorerEntryRefs.current.delete(index) }}
                        className={`${entry.type === 'directory' ? 'explorer-directory' : 'explorer-file'}${index === selectedEntryIndex ? ' is-selected' : ''}`}
                        type="button"
                        tabIndex={-1}
                        onFocus={() => setSelectedEntryIndex(index)}
                        onClick={() => activateExplorerEntry(index)}
                      >
                        <EntryIcon type={entry.type} />
                        <span className="entry-name">{entry.name}</span>
                      </button>
                    </li>
                  ))}
                  {directory.loading ? <li className="explorer-status">Loading folder...</li> : null}
                  {directory.error ? <li className="explorer-error" role="alert">{directory.error}</li> : null}
                </ul>
              </>
            ) : null}
          </aside>
          <div className="explorer-resizer" role="separator" aria-label="Resize Explorer" aria-orientation="vertical" aria-valuemin={192} aria-valuemax={Math.floor(window.innerWidth * 0.45)} aria-valuenow={explorerWidth} tabIndex={-1} onKeyDown={(event) => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); adjustExplorerWidth(event.key === 'ArrowLeft' ? -16 : 16) } }} onPointerDown={startExplorerResize} onPointerMove={resizeExplorer} onPointerUp={stopExplorerResize} onPointerCancel={stopExplorerResize} />
          </>
        ) : null}
        <div className="document-content" tabIndex={0} style={{ '--content-font-scale': contentFontScale } as React.CSSProperties} onWheel={handleContentWheel}>
          {tabs.length === 0 && initialLaunchPending ? <p className="document-status">Opening Markdown file...</p> : null}
          {tabs.length === 0 && launchError ? <p className="document-error" role="alert">{launchError}</p> : null}
          {fileError ? <p className="document-error" role="alert">{fileError}</p> : null}
          {activeTab?.error ? <p className="document-error" role="alert">{activeTab.error}</p> : activeTab?.filePath ? (
            activeTab.content.trim().length > 0 && activeTab.kind === 'markdown' ? (
              <article className="markdown-content">
                <MarkdownErrorBoundary>
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      pre: ({ children }) => {
                        if (!isValidElement<{ className?: string; children?: ReactNode }>(children)) return <pre>{children}</pre>
                        const content = String(children.props.children).replace(/\n$/, '')
                        const language = children.props.className?.match(/language-([^\s]+)/)?.[1] ?? null
                        return <CodePanel content={content} language={language} label="code block" />
                      },
                      code: ({ className, children }) => <code className={className}>{children}</code>,
                      img: ({ alt, src }) => <LocalImage alt={alt} source={src} baseFilePath={activeTab.filePath ?? ''} />,
                      a: ({ href, children }) => (
                        <a
                          href={href}
                          tabIndex={-1}
                          onClick={(event) => {
                            event.preventDefault()
                            if (href) void openMarkdownLink(activeTab.filePath ?? '', href)
                          }}
                        >
                          {children}
                        </a>
                      )
                    }}
                  >
                    {activeTab.content}
                  </ReactMarkdown>
                </MarkdownErrorBoundary>
              </article>
            ) : activeTab.content.trim().length === 0 ? <p className="document-status">This {activeTab.kind === 'markdown' ? 'Markdown' : 'text'} file is empty.</p> : (
              <div className="code-viewer">
                <CodePanel content={activeTab.content} language={activeTab.language} label={`${activeTab.title} contents`} />
              </div>
            )
          ) : <p className="document-status">This tab is ready for a Markdown document.</p>}
        </div>
      </section>
      <footer className="status-bar">{formatStatusBar(activeTab)}</footer>
    </main>
  )
}

export default App
