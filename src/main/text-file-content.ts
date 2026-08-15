export const MAX_TEXT_FILE_BYTES = 10 * 1024 * 1024

export type TextDecodingResult = { ok: true; value: string } | { ok: false; code: 'BINARY_FILE' | 'UNSUPPORTED_ENCODING'; message: string }

export function decodeUtf8(buffer: Buffer): TextDecodingResult {
  if (buffer.includes(0)) return { ok: false, code: 'BINARY_FILE', message: 'The requested file appears to be binary.' }
  try {
    return { ok: true, value: new TextDecoder('utf-8', { fatal: true }).decode(buffer) }
  } catch {
    return { ok: false, code: 'UNSUPPORTED_ENCODING', message: 'The requested file is not valid UTF-8 text.' }
  }
}
