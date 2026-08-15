import { win32 } from 'node:path'

export function isLocalMarkdownLaunchArgument(argument: string): boolean {
  if (!win32.isAbsolute(argument) || !argument.toLowerCase().endsWith('.md')) return false

  const normalizedPath = argument.replaceAll('/', '\\')
  return /^[a-zA-Z]:\\/.test(normalizedPath)
}
