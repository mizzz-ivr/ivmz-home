import { beforeEach, describe, expect, it, vi } from 'vitest'

const auth = vi.fn()
const find = vi.fn()
const createDownloadUrl = vi.fn()

vi.mock('payload', () => ({
  getPayload: async () => ({ auth, find }),
}))
vi.mock('../../../../../payload.config', () => ({ default: {} }))
vi.mock('@/contact/attachments/runtime', () => ({
  getAttachmentRuntime: async () => ({
    storage: { createDownloadUrl },
  }),
}))

import { GET } from './route'

const route = (row: string) =>
  new Request(`https://ivmz.ivrm.jp/api/contact/attachments/download?row=${row}`)

beforeEach(() => {
  vi.clearAllMocks()
  auth.mockResolvedValue({ user: { id: 'admin-1' } })
  find.mockResolvedValue({
    docs: [
      {
        attachments: [{ id: 'row-123', key: 'clean/object-id', filename: 'contact.pdf' }],
      },
    ],
  })
  createDownloadUrl.mockResolvedValue('https://private-s3.example.test/signed?signature=secret')
})

describe('GET /api/contact/attachments/download', () => {
  it('rejects malformed identifiers without authenticating or querying the CMS', async () => {
    const response = await GET(route('row%2F..'))
    expect(response.status).toBe(400)
    expect(auth).not.toHaveBeenCalled()
    expect(find).not.toHaveBeenCalled()
    expect(response.headers.get('Cache-Control')).toBe('private, no-store')
  })

  it('refuses unauthenticated users before looking up any private attachment', async () => {
    auth.mockResolvedValue({ user: null })
    const response = await GET(route('row-123'))
    expect(response.status).toBe(401)
    expect(find).not.toHaveBeenCalled()
    expect(createDownloadUrl).not.toHaveBeenCalled()
    expect(response.headers.get('Referrer-Policy')).toBe('no-referrer')
  })

  it('hides absent attachments without creating a signed link', async () => {
    find.mockResolvedValue({ docs: [] })
    const response = await GET(route('row-123'))
    expect(response.status).toBe(404)
    expect(createDownloadUrl).not.toHaveBeenCalled()
  })

  it('creates a short-lived signed download only after CMS access checks', async () => {
    const response = await GET(route('row-123'))
    expect(response.status).toBe(302)
    expect(response.headers.get('Location')).toContain('signature=secret')
    expect(response.headers.get('Cache-Control')).toBe('private, no-store')
    expect(response.headers.get('Referrer-Policy')).toBe('no-referrer')
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'contact-submissions',
        overrideAccess: false,
        user: { id: 'admin-1' },
      }),
    )
    expect(createDownloadUrl).toHaveBeenCalledWith(
      'clean/object-id',
      'contact.pdf',
      60,
    )
  })
})
