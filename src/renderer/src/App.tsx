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
  const [tabs, setTabs] = useState<Tab[]>([])
  const [activeTabId, setActiveTabId] = useState<string | null>(null)
  const [directory, setDirectory] = useState<DirectoryState>({ entries: [], error: null, loading: false })
  const [selectedEntryIndex, setSelectedEntryIndex] = useState(0)
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
  const explorerEntryRefs = useRef(new Map<number, HTMLButtonElement>())

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
        setTabs([{ id: 'launch-0', filePath: initialFile.filePath, title: initialFile.name, content: initialFile.content, error: null, kind: 'markdown', language: null }])
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

  const switchTab = (direction: 1 | -1): void => {
    const currentTabs = tabsRef.current
    if (currentTabs.length < 2) return
    const currentIndex = currentTabs.findIndex((tab) => tab.id === activeTabIdRef.current)
    const startIndex = currentIndex >= 0 ? currentIndex : 0
    const nextIndex = (startIndex + direction + currentTabs.length) % currentTabs.length
    setActiveTabId(currentTabs[nextIndex].id)
    setFileError(null)
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (!event.ctrlKey || event.altKey || event.metaKey) return
      if (event.key.toLowerCase() === 't') {
        event.preventDefault()
        createEmptyTab()
      } else if (event.key === 'Tab') {
        event.preventDefault()
        switchTab(event.shiftKey ? -1 : 1)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [tabs, activeTabId])

  const createEmptyTab = (): void => {
    hasUserChangedState.current = true
    const id = `empty-${nextTabNumber.current}`
    nextTabNumber.current += 1
    setTabs((currentTabs) => [...currentTabs, { id, filePath: null, title: 'Untitled', content: '', error: null, kind: 'empty', language: null }])
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
      language: result.value.language
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

  const activateExplorerEntry = (index: number): void => {
    const entry = directory.entries[index]
    if (!entry) return
    if (entry.type === 'directory') navigateToDirectory(entry.path)
    else void openFile(entry)
  }

  const handleExplorerKeyDown = (event: React.KeyboardEvent<HTMLElement>): void => {
    if (!rootPath || !currentDirectoryPath) return
    const maximumIndex = directory.entries.length - 1
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
    if (event.key === 'ArrowLeft' && currentDirectoryPath !== rootPath) {
      event.preventDefault()
      const parent = parentDirectory(currentDirectoryPath)
      if (parent) navigateToDirectory(parent)
      return
    }
    if (event.key === 'ArrowRight' || event.key === 'Enter') {
      event.preventDefault()
      activateExplorerEntry(selectedEntryIndex)
    }
  }

  if (!platform) {
    return (
      <main className="app-shell" role="alert">
        <h1>Markdown Browser failed to start</h1>
        <p>The secure preload bridge is unavailable.</p>
      </main>
    )
  }

  if (tabs.length === 0) {
    return (
      <main className="empty-state">
        {initialLaunchPending ? <p className="document-status">Opening Markdown file...</p> : null}
        {launchError ? <p className="document-error" role="alert">{launchError}</p> : null}
        <button className="new-tab-button" type="button" onClick={createEmptyTab} aria-label="Create a new tab">+</button>
      </main>
    )
  }

  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? null

  return (
    <main className="app-shell">
      <header className="tab-bar" aria-label="Open documents">
        <div className="tab-list" role="tablist">
          {tabs.map((tab) => (
            <div key={tab.id} className={tab.id === activeTabId ? 'tab is-active' : 'tab'}>
              <button ref={(element) => { if (element) tabButtonRefs.current.set(tab.id, element); else tabButtonRefs.current.delete(tab.id) }} className="tab-button" type="button" role="tab" aria-selected={tab.id === activeTabId} onClick={() => activateTab(tab.id)}>
                {tab.title}
              </button>
              <button className="tab-close-button" type="button" aria-label={`Close ${tab.title}`} onClick={() => closeTab(tab.id)}>×</button>
            </div>
          ))}
        </div>
        <button className="toolbar-button" type="button" onClick={() => setExplorerVisible((visible) => !visible)}>
          {explorerVisible ? 'Hide Explorer' : 'Show Explorer'}
        </button>
        <button className="new-tab-button tab-add-button" type="button" onClick={createEmptyTab} aria-label="Create a new tab">+</button>
      </header>
      <section className="document-area" role="tabpanel">
        {explorerVisible ? (
          <aside className="explorer" aria-label="Explorer" onKeyDown={handleExplorerKeyDown}>
            <button className="open-folder-button" type="button" onClick={() => void selectRootFolder()}>Open Folder</button>
            {folderError ? <p className="explorer-error" role="alert">{folderError}</p> : null}
            {rootPath ? <p className="root-name" title={rootPath}>{fileName(rootPath)}</p> : <p className="explorer-status">Select a folder to browse supported files.</p>}
            {rootPath && currentDirectoryPath ? (
              <>
                <p className="current-directory" title={currentDirectoryPath}>{currentDirectoryPath}</p>
                <ul className="explorer-tree" aria-label="Current folder contents">
                  <li>
                    <button className="explorer-parent" type="button" disabled={currentDirectoryPath === rootPath} onClick={() => {
                      const parent = parentDirectory(currentDirectoryPath)
                      if (parent) navigateToDirectory(parent)
                    }}>..</button>
                  </li>
                  {directory.entries.map((entry, index) => (
                    <li key={entry.path}>
                      <button
                        ref={(element) => { if (element) explorerEntryRefs.current.set(index, element); else explorerEntryRefs.current.delete(index) }}
                        className={`${entry.type === 'directory' ? 'explorer-directory' : 'explorer-file'}${index === selectedEntryIndex ? ' is-selected' : ''}`}
                        type="button"
                        onFocus={() => setSelectedEntryIndex(index)}
                        onClick={() => activateExplorerEntry(index)}
                      >
                        <span aria-hidden="true">{entry.type === 'directory' ? '[Folder]' : '[File]'}</span>
                        {entry.name}
                      </button>
                    </li>
                  ))}
                  {directory.loading ? <li className="explorer-status">Loading folder...</li> : null}
                  {directory.error ? <li className="explorer-error" role="alert">{directory.error}</li> : null}
                </ul>
              </>
            ) : null}
          </aside>
        ) : null}
        <div className="document-content">
          {fileError ? <p className="document-error" role="alert">{fileError}</p> : null}
          <h1>{activeTab?.title}</h1>
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
    </main>
  )
}

export default App
