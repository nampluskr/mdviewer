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

function CopyIcon(): ReactElement {
  return (
    <svg className="toolbar-icon" viewBox="0 0 16 16" aria-hidden="true">
      <rect x="5.5" y="5.5" width="8" height="8" rx="1" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <path d="M3.5 10.5v-7a1 1 0 0 1 1-1h7" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

export function normalizedLanguage(language: string | null): string | null {
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

const tokenPattern = /(\/\/[^\n]*|#[^\n]*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*":|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b\d+(?:\.\d+)?\b|\b[A-Za-z_][A-Za-z0-9_]*\b)/g

// Mirrors how a per-line highlighter actually tokenizes (one independent match pass per line,
// no cross-line matches), so this budget can't be bypassed by content the whole-file pattern
// would otherwise collapse into a single multi-line token (e.g. a block comment). Bails out of
// both the length check and the running total as early as possible to avoid materializing a huge
// match array for a single pathological line.
export function lineHighlightTokensExceedBudget(lines: string[], maxTokens: number, maxLineLength = 20000): boolean {
  let total = 0
  for (const line of lines) {
    if (line.length > maxLineLength) return true
    const matches = line.match(tokenPattern)
    if (matches) total += matches.length
    if (total > maxTokens) return true
  }
  return false
}

export function highlightedCode(content: string, language: string | null): (ReactElement | string)[] | string {
  if (!language || content.length > 512 * 1024) return content
  const parts = content.split(tokenPattern)
  return parts.map((part, index) => {
    const className = tokenClass(part, language)
    return className ? <span className={className} key={index}>{part}</span> : part
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
        <button className="copy-button toolbar-icon-button" type="button" tabIndex={-1} onClick={() => void copy()} aria-label={`Copy ${label}`} title={`Copy ${label}`}><CopyIcon /></button>
      </div>
      {copyStatus ? <p className={copyFailed ? 'document-error' : 'copy-status'} role={copyFailed ? 'alert' : 'status'}>{copyStatus}</p> : null}
      <pre><code>{highlightedCode(content, displayLanguage)}</code></pre>
    </section>
  )
}
