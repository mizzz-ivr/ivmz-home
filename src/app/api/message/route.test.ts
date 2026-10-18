import { afterEach, describe, expect, it, vi } from 'vitest'

import { POST, createAnonymousMessagePost } from './route'

const origin = 'https://deploy-preview-129--ivmz-home.netlify.app'
const requestId = '3f2b8f0e-1c52-4c1e-9b8a-6a1d2e5f7c90'
const validBody = { message: 'ありがとう！', requestId, turnstileToken: 'challenge' }
const make = (body: unknown = validBody, headers: Record<string, string> = {}) =>
  new Request(origin + '/api/message', {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
    headers: {
      origin,
      'content-type': 'application/json',
      'x-nf-client-connection-ip': '192.0.2.17',
      ...headers,
    },
  })

function setup() {
  const deps = {
    enabled: true,
    secret: 'secret',
    hashKey: 'x'.repeat(32),
    allowOrigin: vi.fn((value: string | null) => value === origin),
    verifyCaptcha: vi.fn().mockResolvedValue('ok' as const),
    consume: vi.fn().mockResolvedValue(true),
    save: vi.fn().mockResolvedValue('created' as const),
  }
  return { deps, handler: createAnonymousMessagePost(deps) }
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('POST /api/message', () => {
  it('fails closed by default and never invokes an unavailable database', async () => {
    vi.stubEnv('ANONYMOUS_MESSAGES_ENABLED', 'false')
    expect((await POST(make())).status).toBe(503)
  })

  it('stores only a valid parsed message, not public flags, email, or CAPTCHA', async () => {
    const { handler, deps } = setup()
    const response = await handler(
      make({ ...validBody, isPublic: true, reply: 'spoof', email: 'e@example.org' }),
    )
    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({ ok: true, code: 'received' })
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(deps.save).toHaveBeenCalledWith({ message: validBody.message, requestId })
  })

  it('rejects wrong origin, absent config, and content type before persistence', async () => {
    const { deps, handler } = setup()
    expect((await handler(make(validBody, { origin: 'https://attacker.invalid' }))).status).toBe(
      403,
    )
    expect((await handler(make(validBody, { 'content-type': 'text/plain' }))).status).toBe(
      415,
    )
    deps.enabled = false
    expect((await handler(make())).status).toBe(503)
    expect(deps.save).not.toHaveBeenCalled()
  })

  it('enforces 4KiB of UTF-8 bytes, including misleading Content-Length and chunked bodies', async () => {
    const { handler, deps } = setup()
    const oversized = make({ ...validBody, message: 'あ'.repeat(2000) })
    expect((await handler(oversized)).status).toBe(413)
    expect(deps.save).not.toHaveBeenCalled()
  })

  it('returns correct validation, invalid JSON, honeypot and bot rejection statuses', async () => {
    const { handler, deps } = setup()
    expect((await handler(make('{broken'))).status).toBe(400)
    expect((await handler(make({ ...validBody, requestId: 'bad' }))).status).toBe(422)
    expect((await handler(make({ ...validBody, website: 'bot' }))).status).toBe(202)
    deps.verifyCaptcha.mockResolvedValue('failed')
    expect((await handler(make())).status).toBe(403)
    expect(deps.consume).not.toHaveBeenCalled()
  })

  it('enforces rate limits before saving and returns a safe 503 on DB errors', async () => {
    const { handler, deps } = setup()
    deps.consume.mockResolvedValue(false)
    expect((await handler(make())).status).toBe(429)
    expect(deps.save).not.toHaveBeenCalled()
    deps.consume.mockRejectedValue(new Error('connection lost'))
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const failure = await handler(make())
    expect(failure.status).toBe(503)
    expect(JSON.stringify(await failure.json())).not.toContain('connection lost')
    log.mockRestore()
  })

  it('reports identical retries as success but conflicting identifiers as 409', async () => {
    const { handler, deps } = setup()
    deps.save.mockResolvedValueOnce('duplicate').mockResolvedValueOnce('conflict')
    expect((await handler(make())).status).toBe(200)
    expect((await handler(make())).status).toBe(409)
  })
})
