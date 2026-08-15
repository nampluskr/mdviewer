import { describe, expect, it } from 'vitest'
import { isLocalMarkdownLaunchArgument } from './launch-argument'

describe('isLocalMarkdownLaunchArgument', () => {
  it('accepts absolute local Markdown file paths', () => {
    expect(isLocalMarkdownLaunchArgument('C:\\notes\\guide.md')).toBe(true)
  })

  it('rejects UNC and extended UNC Markdown paths before filesystem access', () => {
    expect(isLocalMarkdownLaunchArgument('\\\\server\\share\\guide.md')).toBe(false)
    expect(isLocalMarkdownLaunchArgument('\\\\?\\UNC\\server\\share\\guide.md')).toBe(false)
  })

  it('rejects relative, driveless absolute, and non-Markdown paths', () => {
    expect(isLocalMarkdownLaunchArgument('guide.md')).toBe(false)
    expect(isLocalMarkdownLaunchArgument('\\notes.md')).toBe(false)
    expect(isLocalMarkdownLaunchArgument('C:\\notes\\guide.txt')).toBe(false)
  })
})
