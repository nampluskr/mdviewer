import { type ReactElement, useEffect, useState } from 'react'

interface CodePanelProps {
  content: string
  language: string | null
  label: string
}

const languageAliases: Record<string, string> = {
  py: 'python',
  'c++': 'cpp',
  cxx: 'cpp',
  ts: 'typescript',
  js: 'javascript',
  yml: 'yaml',
  sh: 'bash',
  shell: 'bash'
}

const supportedLanguages = new Set(['python', 'cpp', 'typescript', 'javascript', 'json', 'powershell', 'yaml', 'toml', 'bash'])

const keywords = new Set([
  'and', 'as', 'async', 'await', 'break', 'case', 'catch', 'class', 'const', 'continue', 'def', 'default', 'delete', 'do', 'else', 'enum', 'except', 'export', 'extends', 'finally', 'for', 'from', 'function', 'if', 'import', 'in', 'interface', 'is', 'lambda', 'let', 'match', 'new', 'not', 'null', 'or', 'pass', 'private', 'protected', 'public', 'return', 'static', 'switch', 'throw', 'try', 'type', 'var', 'void', 'while', 'with', 'yield', 'true', 'false'
])

function normalizedLanguage(language: string | null): string | null {
  if (!language) return null
  const normalized = language.toLowerCase()
  const resolved = languageAliases[normalized] ?? normalized
  return supportedLanguages.has(resolved) ? resolved : null
}

function tokenClass(token: string, language: string | null): string | null {
  if (/^(?:\/\/|#|\/\*)/.test(token)) return 'syntax-comment'
  if (/^(?:"|'|`)/.test(token)) return 'syntax-string'
  if (/^\d/.test(token)) return 'syntax-number'
  if (keywords.has(token.toLowerCase())) return 'syntax-keyword'
  if (language === 'json' && /^".*":$/.test(token)) return 'syntax-property'
  return null
}

function highlightedCode(content: string, language: string | null): ReactElement[] | string {
  if (!language || content.length > 512 * 1024) return content
  const pattern = /(\/\/[^\n]*|#[^\n]*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*":|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b\d+(?:\.\d+)?\b|\b[A-Za-z_][A-Za-z0-9_]*\b)/g
  const parts = content.split(pattern)
  return parts.map((part, index) => {
    const className = tokenClass(part, language)
    return className ? <span className={className} key={index}>{part}</span> : <span key={index}>{part}</span>
  })
}

export function CodePanel({ content, language, label }: CodePanelProps): ReactElement {
  const [copyStatus, setCopyStatus] = useState<string | null>(null)
  const [copyFailed, setCopyFailed] = useState(false)
  const displayLanguage = normalizedLanguage(language)

  useEffect(() => {
    setCopyStatus(null)
    setCopyFailed(false)
  }, [content, displayLanguage])

  const copy = async (): Promise<void> => {
    try {
      const result = await window.markdownBrowser.writeClipboardText(content)
      setCopyStatus(result.ok ? 'Copied to clipboard.' : result.error.message)
      setCopyFailed(!result.ok)
    } catch {
      setCopyStatus('Unable to copy text to the clipboard.')
      setCopyFailed(true)
    }
  }

  return (
    <section className="code-panel">
      <div className="code-panel-toolbar">
        <span className="code-language">{displayLanguage ?? 'plain text'}</span>
        <button className="copy-button" type="button" onClick={() => void copy()} aria-label={`Copy ${label}`}>Copy</button>
      </div>
      {copyStatus ? <p className={copyFailed ? 'document-error' : 'copy-status'} role={copyFailed ? 'alert' : 'status'}>{copyStatus}</p> : null}
      <pre><code>{highlightedCode(content, displayLanguage)}</code></pre>
    </section>
  )
}
