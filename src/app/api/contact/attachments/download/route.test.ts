import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  find: vi.fn(),
  getPayload: vi.fn(),
  runtime: vi.fn(),
  exists: vi.fn(),
  sign: vi.fn(),
}))

vi.mock('payload', () => ({ getPayload: mocks.getPayload }))
vi.mock('../../../../../payload.config', () => ({ default: {} }))
vi.mock('@/contact/attachments/runtime', () => ({
  getAttachmentRuntime: mocks.runtime,
}))

const attachment = {
  filename: 'document.pdf',
  id: 'attachment_1',
  key: 'clean/attachment-1',
}

async function download(row = attachment.id) {
  const { GET } = await import('./route')
  return GET(new Request(`https://ivmz.ivrm.jp/api/contact/attachments/download?row=${row}`))
}

beforeEach(() => {
  vi.resetAllMocks()
  mocks.getPayload.mockResolvedValue({
    auth: mocks.auth,
    config: { admin: { user: 'users' } },
    find: mocks.find,
  })
  mocks.auth.mockResolvedValue({ user: { collection: 'users', id: 1 } })
  mocks.find.mockResolvedValue({
    docs: [{ attachments: [attachment] }],
  })
  mocks.exists.mockResolvedValue(true)
  mocks.sign.mockResolvedValue('https://private-files.example.invalid/signed')
  mocks.runtime.mockResolvedValue({
    storage: {
      createDownloadUrl: mocks.sign,
      exists: mocks.exists,
    },
  })
})

describe('GET /api/contact/attachments/download', () => {
  it('rejects invalid row IDs before any authentication or S3 access', async () => {
    for (const row of ['', 'abc%2Fdef', 'a'.repeat(65)]) {
      const response = await download(row)
      expect(response.status).toBe(400)
    }
    expect(mocks.getPayload).not.toHaveBeenCalled()
    expect(mocks.exists).not.toHaveBeenCalled()
  })

  it('does not inspect S3 without an authenticated CMS administrator', async () => {
    mocks.auth.mockResolvedValueOnce({ user: null })
    expect((await download()).status).toBe(401)
    mocks.auth.mockResolvedValueOnce({ user: { collection: 'other-users', id: 2 } })
    expect((await download()).status).toBe(403)
    expect(mocks.find).not.toHaveBeenCalled()
    expect(mocks.exists).not.toHaveBeenCalled()
  })

  it('returns 404 without S3 access when no authorized inbox row exists', async () => {
    mocks.find.mockResolvedValueOnce({ docs: [] })
    expect((await download()).status).toBe(404)
    expect(mocks.runtime).not.toHaveBeenCalled()
    expect(mocks.exists).not.toHaveBeenCalled()
  })

  it('returns 503 when attachment storage is not configured', async () => {
    mocks.runtime.mockResolvedValueOnce(null)
    expect((await download()).status).toBe(503)
    expect(mocks.exists).not.toHaveBeenCalled()
  })

  it('returns 404 instead of a signed URL when the S3 object is missing', async () => {
    mocks.exists.mockResolvedValueOnce(false)
    const response = await download()
    expect(response.status).toBe(404)
    expect(response.headers.get('location')).toBeNull()
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(mocks.exists).toHaveBeenCalledWith(attachment.key)
    expect(mocks.sign).not.toHaveBeenCalled()
  })

  it('fails closed on S3 access or signing errors without leaking details', async () => {
    for (const fail of ['head', 'sign']) {
      if (fail === 'head') mocks.exists.mockRejectedValueOnce(new Error('secret S3 key'))
      if (fail === 'sign') mocks.sign.mockRejectedValueOnce(new Error('secret S3 key'))
      const response = await download()
      expect(response.status).toBe(503)
      expect(response.headers.get('location')).toBeNull()
      expect(await response.text()).toBe('')
    }
  })

  it('redirects for an existing object only after authentication and HEAD', async () => {
    const response = await download()
    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe('https://private-files.example.invalid/signed')
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(response.headers.get('referrer-policy')).toBe('no-referrer')
    expect(mocks.find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'contact-submissions',
        overrideAccess: false,
        where: { 'attachments.id': { equals: attachment.id } },
      }),
    )
    expect(mocks.exists).toHaveBeenCalledWith(attachment.key)
    expect(mocks.sign).toHaveBeenCalledWith(attachment.key, attachment.filename, 60)
    expect(mocks.exists.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.sign.mock.invocationCallOrder[0],
    )
  })
})
