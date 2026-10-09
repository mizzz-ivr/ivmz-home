import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { resolveAttachmentPolicy } from '@/contact/attachments/policy'
import type { AttachmentStorage } from '@/contact/attachments/storage'

const origin = 'https://ivmz.ivrm.jp'
const SECRET = 'route-test-secret'

const uploads: unknown[] = []
const storage: AttachmentStorage = {
  createDownloadUrl: async () => 'https://example.test/download',
  createUploadForm: async (input) => {
    uploads.push(input)
    return { fields: { key: input.key }, url: 'https://bucket.example.test' }
  },
  deleteObject: async () => {},
  exists: async () => true,
  getScanStatus: async () => 'pending',
  putObject: async () => {},
  readObject: async () => Buffer.alloc(0),
}

let enabled = true

vi.mock('@/contact/attachments/runtime', () => ({
  getAttachmentRuntime: async () =>
    process.env.TEST_RUNTIME_MISSING
      ? null
      : {
          policy: resolveAttachmentPolicy(
            { allowedTypes: ['png', 'pdf'], attachmentsEnabled: enabled },
            { storageConfigured: true },
          ),
          secret: SECRET,
          storage,
        },
}))

beforeEach(() => {
  enabled = true
  uploads.length = 0
  vi.stubEnv('PAYLOAD_BUILD_CONTEXT', 'production')
})

afterEach(() => {
  vi.unstubAllEnvs()
})

function post(path: string, body: unknown, headers: Record<string, string> = {}) {
  return new Request(`${origin}${path}`, {
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json', Origin: origin, ...headers },
    method: 'POST',
  })
}

describe('GET /api/contact/attachments/policy', () => {
  it('exposes only the public policy', async () => {
    const { GET } = await import('./policy/route')
    const body = await (await GET()).json()

    expect(body.enabled).toBe(true)
    expect(body.types.map((type: { id: string }) => type.id)).toEqual(['png', 'pdf'])
    expect(JSON.stringify(body)).not.toMatch(/bucket|secret|key/i)
  })

  it('reports disabled when no storage is configured', async () => {
    vi.stubEnv('TEST_RUNTIME_MISSING', '1')
    const { GET } = await import('./policy/route')
    expect((await (await GET()).json()).enabled).toBe(false)
  })
})

describe('POST /api/contact/attachments', () => {
  it('rejects cross-origin, wrong content-type and malformed bodies', async () => {
    const { POST } = await import('./route')

    expect(
      (await POST(post('/api/contact/attachments', {}, { Origin: 'https://evil.test' }))).status,
    ).toBe(403)
    expect(
      (
        await POST(
          new Request(`${origin}/api/contact/attachments`, {
            body: 'x',
            headers: { 'Content-Type': 'text/plain', Origin: origin },
            method: 'POST',
          }),
        )
      ).status,
    ).toBe(415)
    expect(
      (
        await POST(
          new Request(`${origin}/api/contact/attachments`, {
            body: '[1]',
            headers: { 'Content-Type': 'application/json', Origin: origin },
            method: 'POST',
          }),
        )
      ).status,
    ).toBe(400)
  })

  it('creates a quarantine upload for an allowed file', async () => {
    const { POST } = await import('./route')
    const response = await POST(
      post('/api/contact/attachments', { name: 'photo.png', size: 1234, type: 'image/png' }),
    )
    const body = await response.json()

    expect(response.status).toBe(201)
    expect(body.ok).toBe(true)
    expect(body.upload.url).toBe('https://bucket.example.test')
    expect(typeof body.uploadToken).toBe('string')
  })

  it('maps validation failures to client errors', async () => {
    const { POST } = await import('./route')

    const type = await POST(
      post('/api/contact/attachments', {
        name: 'run.exe',
        size: 5,
        type: 'application/x-msdownload',
      }),
    )
    expect(type.status).toBe(422)
    expect((await type.json()).code).toBe('type_not_allowed')

    const large = await POST(
      post('/api/contact/attachments', {
        name: 'a.png',
        size: 99 * 1024 * 1024,
        type: 'image/png',
      }),
    )
    expect(large.status).toBe(413)

    enabled = false
    const off = await POST(
      post('/api/contact/attachments', { name: 'a.png', size: 5, type: 'image/png' }),
    )
    expect(off.status).toBe(403)
  })
})

describe('POST /api/contact/attachments/finalize', () => {
  it('rejects a forged upload token', async () => {
    const { POST } = await import('./finalize/route')
    const response = await POST(
      post('/api/contact/attachments/finalize', { uploadToken: 'forged.token' }),
    )
    expect(response.status).toBe(400)
  })

  it('reports scanning (202) for a freshly uploaded file', async () => {
    const { POST: init } = await import('./route')
    const { POST: finalize } = await import('./finalize/route')
    const started = await (
      await init(
        post('/api/contact/attachments', { name: 'photo.png', size: 10, type: 'image/png' }),
      )
    ).json()

    const response = await finalize(
      post('/api/contact/attachments/finalize', { uploadToken: started.uploadToken }),
    )
    expect(response.status).toBe(202)
    expect((await response.json()).status).toBe('scanning')
  })
})

describe('POST /api/contact with attachment tokens', () => {
  it('refuses a forged attachment token without storing anything', async () => {
    const { POST } = await import('../route')
    const response = await POST(
      post('/api/contact', {
        attachments: ['forged.token'],
        category: 'personal',
        email: 'visitor@example.com',
        message: 'Hello',
        name: 'Visitor',
        subject: 'Hello',
        website: '',
      }),
    )

    expect(response.status).toBe(422)
    expect((await response.json()).code).toBe('attachment_invalid')
  })
})
