export type SupportedFileKind = 'markdown' | 'text' | 'code'

export interface SupportedFileType {
  kind: SupportedFileKind
  language: string | null
}

const supportedTypes: Record<string, SupportedFileType> = {
  '.md': { kind: 'markdown', language: null },
  '.txt': { kind: 'text', language: null },
  '.log': { kind: 'text', language: null },
  '.py': { kind: 'code', language: 'Python' },
  '.pyi': { kind: 'code', language: 'Python' },
  '.cpp': { kind: 'code', language: 'C++' },
  '.cc': { kind: 'code', language: 'C++' },
  '.cxx': { kind: 'code', language: 'C++' },
  '.h': { kind: 'code', language: 'C++' },
  '.hpp': { kind: 'code', language: 'C++' },
  '.ts': { kind: 'code', language: 'TypeScript' },
  '.tsx': { kind: 'code', language: 'TypeScript' },
  '.js': { kind: 'code', language: 'JavaScript' },
  '.jsx': { kind: 'code', language: 'JavaScript' },
  '.mjs': { kind: 'code', language: 'JavaScript' },
  '.cjs': { kind: 'code', language: 'JavaScript' },
  '.json': { kind: 'code', language: 'JSON' },
  '.jsonc': { kind: 'code', language: 'JSON' },
  '.ps1': { kind: 'code', language: 'PowerShell' },
  '.psm1': { kind: 'code', language: 'PowerShell' },
  '.psd1': { kind: 'code', language: 'PowerShell' },
  '.yml': { kind: 'code', language: 'YAML' },
  '.yaml': { kind: 'code', language: 'YAML' },
  '.toml': { kind: 'code', language: 'TOML' },
  '.sh': { kind: 'code', language: 'Bash' },
  '.bash': { kind: 'code', language: 'Bash' }
}

const imageExtensions = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'])

function extensionOf(filePath: string): string {
  const lastDot = filePath.lastIndexOf('.')
  const lastSeparator = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'))
  return lastDot > lastSeparator ? filePath.slice(lastDot).toLowerCase() : ''
}

export function classifySupportedFile(filePath: string): SupportedFileType | null {
  return supportedTypes[extensionOf(filePath)] ?? null
}

export function isSupportedImage(filePath: string): boolean {
  return imageExtensions.has(extensionOf(filePath))
}
