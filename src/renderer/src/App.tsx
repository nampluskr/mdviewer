import { useRef, useState } from 'react'
import type { ReactElement } from 'react'

interface Tab {
  id: string
  filePath: string | null
  title: string
  content: string
}

function App(): ReactElement {
  const platform = window.markdownBrowser?.platform
  const [rootPath] = useState<string | null>(null)
  const [explorerVisible] = useState(true)
  const [tabs, setTabs] = useState<Tab[]>([])
  const [activeTabId, setActiveTabId] = useState<string | null>(null)
  const nextTabNumber = useRef(1)

  const createEmptyTab = (): void => {
    const id = `empty-${nextTabNumber.current}`
    nextTabNumber.current += 1

    setTabs((currentTabs) => [
      ...currentTabs,
      { id, filePath: null, title: 'Untitled', content: '' }
    ])
    setActiveTabId(id)
  }

  const closeTab = (tabId: string): void => {
    setTabs((currentTabs) => {
      const closingIndex = currentTabs.findIndex((tab) => tab.id === tabId)
      const remainingTabs = currentTabs.filter((tab) => tab.id !== tabId)

      if (tabId === activeTabId) {
        const nextActiveTab = remainingTabs[closingIndex] ?? remainingTabs[closingIndex - 1] ?? null
        setActiveTabId(nextActiveTab?.id ?? null)
      }

      return remainingTabs
    })
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
        <button className="new-tab-button" type="button" onClick={createEmptyTab} aria-label="Create a new tab">
          +
        </button>
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
              <button
                className="tab-button"
                type="button"
                role="tab"
                aria-selected={tab.id === activeTabId}
                onClick={() => setActiveTabId(tab.id)}
              >
                {tab.title}
              </button>
              <button
                className="tab-close-button"
                type="button"
                aria-label={`Close ${tab.title}`}
                onClick={() => closeTab(tab.id)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <button className="new-tab-button tab-add-button" type="button" onClick={createEmptyTab} aria-label="Create a new tab">
          +
        </button>
      </header>
      <section className="document-area" role="tabpanel">
        {explorerVisible && rootPath ? <aside className="explorer-placeholder" aria-label="Explorer" /> : null}
        <div className="empty-tab-content">
          <h1>{activeTab?.title}</h1>
          <p>This tab is ready for a Markdown document.</p>
        </div>
      </section>
    </main>
  )
}

export default App
