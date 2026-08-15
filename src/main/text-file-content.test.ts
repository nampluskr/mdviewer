import { describe, expect, it } from 'vitest'
import { MAX_TEXT_FILE_BYTES, decodeUtf8 } from './text-file-content'

describe('decodeUtf8', () => {
  it('accepts valid UTF-8 text', () => {
    expect(decodeUtf8(Buffer.from('Markdown Browser', 'utf8'))).toEqual({ ok: true, value: 'Markdown Browser' })
  })

  it('rejects NUL bytes as binary data', () => {
    expect(decodeUtf8(Buffer.from([0x61, 0x00, 0x62]))).toMatchObject({ ok: false, code: 'BINARY_FILE' })
  })

  it('rejects invalid UTF-8 byte sequences', () => {
    expect(decodeUtf8(Buffer.from([0xc3, 0x28]))).toMatchObject({ ok: false, code: 'UNSUPPORTED_ENCODING' })
  })

  it('uses the specified 10 MiB text and code file limit', () => {
    expect(MAX_TEXT_FILE_BYTES).toBe(10 * 1024 * 1024)
  })
})
