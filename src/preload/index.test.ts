import { describe, expect, it, vi } from 'vitest'

const invoke = vi.fn()
let exposedApi: unknown

vi.mock('electron', () => ({
  contextBridge: { exposeInMainWorld: (_name: string, value: unknown) => { exposedApi = value } },
  ipcRenderer: { invoke }
}))

describe('preload API input validation', async () => {
  await import('./index')

  it('rejects malformed input before IPC', async () => {
    const api = exposedApi as MarkdownBrowserApi
    await expect(api.readFile(null as unknown as string)).resolves.toMatchObject({ ok: false, error: { code: 'INVALID_PATH' } })
    await expect(api.resolveRelativeResource('C:\\notes\\guide.md', '../outside.md', 'other' as 'image')).resolves.toMatchObject({ ok: false, error: { code: 'INVALID_PATH' } })
    expect(invoke).not.toHaveBeenCalled()
  })

  it('forwards valid input only through the allowlisted IPC channel', async () => {
    const api = exposedApi as MarkdownBrowserApi
    invoke.mockResolvedValueOnce({ ok: true, value: { content: '# Guide', kind: 'markdown', language: null } })
    await api.readFile('C:\\notes\\guide.md')
    expect(invoke).toHaveBeenCalledWith('filesystem:read-file', 'C:\\notes\\guide.md')
  })
})
