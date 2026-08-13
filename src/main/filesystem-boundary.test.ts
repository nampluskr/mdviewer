import { describe, expect, it } from 'vitest'
import { isWithinRoot } from './filesystem-boundary'

describe('isWithinRoot', () => {
  const rootPath = 'C:\\workspace\\notes'

  it('allows the Root Folder and its descendants', () => {
    expect(isWithinRoot(rootPath, rootPath)).toBe(true)
    expect(isWithinRoot(rootPath, 'C:\\workspace\\notes\\guide.md')).toBe(true)
    expect(isWithinRoot(rootPath, 'C:\\workspace\\notes\\docs\\setup.md')).toBe(true)
  })

  it('rejects parent directories, sibling directories, and another volume', () => {
    expect(isWithinRoot(rootPath, 'C:\\workspace')).toBe(false)
    expect(isWithinRoot(rootPath, 'C:\\workspace\\notes-archive\\guide.md')).toBe(false)
    expect(isWithinRoot(rootPath, 'D:\\workspace\\notes\\guide.md')).toBe(false)
  })
})
