import type { ReactElement } from 'react'

function App(): ReactElement {
  const platform = window.markdownBrowser?.platform

  if (!platform) {
    return (
      <main className="app-shell" role="alert">
        <h1>Markdown Browser failed to start</h1>
        <p>The secure preload bridge is unavailable.</p>
      </main>
    )
  }

  return (
    <main className="app-shell">
      <h1>Markdown Browser</h1>
      <p>Application foundation is ready for {platform}.</p>
    </main>
  )
}

export default App
