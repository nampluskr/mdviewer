import { isAbsolute, relative, sep } from 'node:path'

export function isWithinRoot(rootPath: string, candidatePath: string): boolean {
  const relativePath = relative(rootPath, candidatePath)
  return (
    relativePath === '' ||
    (!isAbsolute(relativePath) && !relativePath.startsWith(`..${sep}`) && relativePath !== '..')
  )
}
