import { Component, useEffect, useRef, useState } from 'react'
import type { ErrorInfo, ReactElement, ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface Tab {
  id: string
  filePath: string | null
  title: string
  content: string
  error: string | null
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

function App(): ReactElement {
  const platform = window.markdownBrowser?.platform
  const [rootPath, setRootPath] = useState<string | null>(null)
  const [explorerVisible, setExplorerVisible] = useState(true)
  const [tabs, setTabs] = useState<Tab[]>([])
  const [activeTabId, setActiveTabId] = useState<string | null>(null)
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set())
  const [directories, setDirectories] = useState<Record<string, DirectoryState>>({})
  const [folderError, setFolderError] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [launchError, setLaunchError] = useState<string | null>(null)
  const [initialLaunchPending, setInitialLaunchPending] = useState(true)
  const nextTabNumber = useRef(1)
  const fileLoadVersions = useRef(new Map<string, number>())
  const directoryLoadVersions = useRef(new Map<string, number>())

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

        const initialFile = result.value
        setRootPath(initialFile.rootPath)
        setExpandedPaths(new Set([initialFile.rootPath]))
        setDirectories({})
        setFileError(null)
        setTabs([{ id: 'launch-0', filePath: initialFile.filePath, title: initialFile.name, content: initialFile.content, error: null }])
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

  const createEmptyTab = (): void => {
    const id = `empty-${nextTabNumber.current}`
    nextTabNumber.current += 1
    setTabs((currentTabs) => [...currentTabs, { id, filePath: null, title: 'Untitled', content: '', error: null }])
    setFileError(null)
    setActiveTabId(id)
  }

  const closeTab = (tabId: string): void => {
    const closingIndex = tabs.findIndex((tab) => tab.id === tabId)
    const remainingTabs = tabs.filter((tab) => tab.id !== tabId)
    if (tabId === activeTabId) {
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

    const loadVersion = (directoryLoadVersions.current.get(directoryPath) ?? 0) + 1
    directoryLoadVersions.current.set(directoryPath, loadVersion)
    setDirectories((current) => ({
      ...current,
      [directoryPath]: { entries: current[directoryPath]?.entries ?? [], error: null, loading: true }
    }))
    const result = await window.markdownBrowser.listDirectory(directoryPath)
    if (directoryLoadVersions.current.get(directoryPath) !== loadVersion) return
    setDirectories((current) => ({
      ...current,
      [directoryPath]: result.ok
        ? { entries: result.value, error: null, loading: false }
        : { entries: [], error: result.error.message, loading: false }
    }))
    if (!result.ok && directoryPath === rootPath) setFolderError(result.error.message)
  }

  const selectRootFolder = async (): Promise<void> => {
    if (!window.markdownBrowser) return

    setFolderError(null)
    const result = await window.markdownBrowser.selectRootFolder()
    if (!result.ok) {
      setFolderError(result.error.message)
      return
    }

    setRootPath(result.value.rootPath)
    setExpandedPaths(new Set([result.value.rootPath]))
    setDirectories({})
    setFileError(null)
    await loadDirectory(result.value.rootPath)
  }

  const toggleDirectory = (directoryPath: string): void => {
    const isExpanded = expandedPaths.has(directoryPath)
    setExpandedPaths((current) => {
      const next = new Set(current)
      if (isExpanded) next.delete(directoryPath)
      else next.add(directoryPath)
      return next
    })
    if (!isExpanded) void loadDirectory(directoryPath)
  }

  const openMarkdownFile = async (entry: DirectoryEntry): Promise<void> => {
    if (!window.markdownBrowser) return
    if (!activeTabId) {
      setFileError('Create or select a tab before opening a Markdown file.')
      return
    }

    const targetTabId = activeTabId
    const loadVersion = (fileLoadVersions.current.get(targetTabId) ?? 0) + 1
    fileLoadVersions.current.set(targetTabId, loadVersion)
    const alreadyOpen = tabs.find((tab) => tab.filePath === entry.path)
    if (alreadyOpen) {
      setFileError(null)
      setActiveTabId(alreadyOpen.id)
      return
    }

    setFileError(null)
    const result = await window.markdownBrowser.readMarkdownFile(entry.path)
    if (fileLoadVersions.current.get(targetTabId) !== loadVersion) return
    if (!result.ok) {
      setTabs((currentTabs) => currentTabs.map((tab) => (
        tab.id === targetTabId ? { ...tab, content: '', error: result.error.message } : tab
      )))
      return
    }

    setTabs((currentTabs) => currentTabs.map((tab) => (
      tab.id === targetTabId
        ? { ...tab, filePath: entry.path, title: entry.name, content: result.value.content, error: null }
        : tab
    )))
  }

  const renderDirectory = (directoryPath: string, depth: number): ReactElement => {
    const directory = directories[directoryPath]
    const entries = directory?.entries ?? []

    return (
      <ul className="explorer-tree" aria-label={depth === 0 ? 'Root folder contents' : undefined}>
        {entries.map((entry) => {
          if (entry.type === 'markdown') {
            return (
              <li key={entry.path}>
                <button className="explorer-file" type="button" onClick={() => void openMarkdownFile(entry)}>
                  {entry.name}
                </button>
              </li>
            )
          }

          const isExpanded = expandedPaths.has(entry.path)
          return (
            <li key={entry.path}>
              <button className="explorer-directory" type="button" onClick={() => toggleDirectory(entry.path)} aria-expanded={isExpanded}>
                <span aria-hidden="true">{isExpanded ? '−' : '+'}</span>
                {entry.name}
              </button>
              {isExpanded ? renderDirectory(entry.path, depth + 1) : null}
            </li>
          )
        })}
        {directory?.loading ? <li className="explorer-status">Loading folder…</li> : null}
        {directory?.error ? <li className="explorer-error">{directory.error}</li> : null}
      </ul>
    )
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
              <button className="tab-button" type="button" role="tab" aria-selected={tab.id === activeTabId} onClick={() => activateTab(tab.id)}>
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
          <aside className="explorer" aria-label="Explorer">
            <button className="open-folder-button" type="button" onClick={() => void selectRootFolder()}>Open Folder</button>
            {folderError ? <p className="explorer-error" role="alert">{folderError}</p> : null}
            {rootPath ? <p className="root-name" title={rootPath}>{fileName(rootPath)}</p> : <p className="explorer-status">Select a folder to browse Markdown files.</p>}
            {rootPath ? renderDirectory(rootPath, 0) : null}
          </aside>
        ) : null}
        <div className="document-content">
          {fileError ? <p className="document-error" role="alert">{fileError}</p> : null}
          <h1>{activeTab?.title}</h1>
          {activeTab?.error ? <p className="document-error" role="alert">{activeTab.error}</p> : activeTab?.filePath ? (
            activeTab.content.trim().length > 0 ? (
              <article className="markdown-content">
                <MarkdownErrorBoundary>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{activeTab.content}</ReactMarkdown>
                </MarkdownErrorBoundary>
              </article>
            ) : <p className="document-status">This Markdown file is empty.</p>
          ) : <p className="document-status">This tab is ready for a Markdown document.</p>}
        </div>
      </section>
    </main>
  )
}

export default App
