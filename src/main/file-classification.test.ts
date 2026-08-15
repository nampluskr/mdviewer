import { describe, expect, it } from 'vitest'
import { classifySupportedFile, isSupportedImage } from './file-classification'

describe('classifySupportedFile', () => {
  it('classifies every supported file family without case sensitivity', () => {
    expect(classifySupportedFile('guide.MD')).toEqual({ kind: 'markdown', language: null })
    expect(classifySupportedFile('events.LOG')).toEqual({ kind: 'text', language: null })
    expect(classifySupportedFile('model.PYI')).toEqual({ kind: 'code', language: 'Python' })
    expect(classifySupportedFile('main.HPP')).toEqual({ kind: 'code', language: 'C++' })
    expect(classifySupportedFile('component.TSX')).toEqual({ kind: 'code', language: 'TypeScript' })
    expect(classifySupportedFile('config.JSONC')).toEqual({ kind: 'code', language: 'JSON' })
    expect(classifySupportedFile('profile.PSD1')).toEqual({ kind: 'code', language: 'PowerShell' })
    expect(classifySupportedFile('settings.YAML')).toEqual({ kind: 'code', language: 'YAML' })
    expect(classifySupportedFile('script.BASH')).toEqual({ kind: 'code', language: 'Bash' })
  })

  it('rejects unsupported files and identifies images only for Markdown resources', () => {
    expect(classifySupportedFile('image.png')).toBeNull()
    expect(classifySupportedFile('README')).toBeNull()
    expect(isSupportedImage('image.SVG')).toBe(true)
    expect(isSupportedImage('image.bmp')).toBe(false)
  })
})
