import { describe, expect, it, vi } from 'vitest'

import { createPublicationPost } from './route'
import { PublicationRejected } from '@/messages/publication-admin'

const origin = 'https://ivmz.ivrm.jp'
const request = (payload: unknown, overrides: Record<string, string> = {}) =>
  new Request(origin + '/api/message/admin/publication', {
    method: 'POST',
    headers: { origin, 'content-type': 'application/json', ...overrides },
    body: typeof payload === 'string' ? payload : JSON.stringify(payload),
  })

function make() {
  const deps = {
    enabled: true,
    allowedOrigin: (value: string | null) => value === origin,
    authenticate: vi.fn().mockResolvedValue({
      user: { id: 7, collection: 'users' },
      adminCollection: 'users',
    }),
    apply: vi.fn().mockResolvedValue({ publicId: 'a'.repeat(22) }),
  }
  return { deps, handler: createPublicationPost(deps) }
}

describe('audited admin publication endpoint', () => {
  it('denies wrong origins, disabled mode, anonymous auth and other user collections', async () => {
    const { deps, handler } = make()
    expect(
      (await handler(request({ messageId: 1, action: 'publish' }, { origin: 'https://evil.test' })))
        .status,
    ).toBe(403)
    expect(deps.authenticate).not.toHaveBeenCalled()
    deps.enabled = false
    expect((await handler(request({ messageId: 1, action: 'publish' }))).status).toBe(503)
    deps.enabled = true
    deps.authenticate.mockResolvedValueOnce({ user: null, adminCollection: 'users' })
    expect((await handler(request({ messageId: 1, action: 'publish' }))).status).toBe(401)
    deps.authenticate.mockResolvedValueOnce({
      user: { id: 9, collection: 'customers' },
      adminCollection: 'users',
    })
    expect((await handler(request({ messageId: 1, action: 'publish' }))).status).toBe(403)
    expect(deps.apply).not.toHaveBeenCalled()
  })

  it('requires exact schema and valid admin body, including size and content type', async () => {
    const { deps, handler } = make()
    for (const input of [
      { messageId: 0, action: 'publish' },
      { messageId: '7', action: 'publish' },
      { messageId: 7, action: 'auto' },
      { messageId: 7, action: 'publish', isPublic: true },
    ]) {
      expect((await handler(request(input))).status).toBe(422)
    }
    expect((await handler(request([7, 'publish']))).status).toBe(400)
    expect((await handler(request('invalid-json'))).status).toBe(400)
    expect(
      (
        await handler(
          request({ messageId: 7, action: 'publish' }, { 'content-type': 'text/plain' }),
        )
      ).status,
    ).toBe(415)
    expect(
      (await handler(request({ messageId: 7, action: 'publish', padding: 'x'.repeat(2000) })))
        .status,
    ).toBe(413)
    expect(deps.apply).not.toHaveBeenCalled()
  })

  it('only invokes authenticated admin publication and exposes no internal identifiers on withdrawal', async () => {
    const { deps, handler } = make()
    const approved = await handler(request({ messageId: 42, action: 'publish' }))
    expect(approved.status).toBe(200)
    expect(await approved.json()).toEqual({ ok: true, code: 'published', publicId: 'a'.repeat(22) })
    expect(deps.apply).toHaveBeenCalledWith(42, 7, 'publish')
    deps.apply.mockResolvedValueOnce({ publicId: null })
    const withdrawn = await handler(request({ messageId: 42, action: 'unpublish' }))
    expect(await withdrawn.json()).toEqual({ ok: true, code: 'unpublished' })
    expect(withdrawn.headers.get('cache-control')).toBe('no-store')
  })

  it('maps publication conflicts and DB errors without exposing private text', async () => {
    const { deps, handler } = make()
    deps.apply.mockRejectedValueOnce(new PublicationRejected('reply_not_ready', 409))
    expect((await handler(request({ messageId: 42, action: 'publish' }))).status).toBe(409)
    deps.apply.mockRejectedValueOnce(new Error('secret-body in exception'))
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const response = await handler(request({ messageId: 42, action: 'publish' }))
    expect(response.status).toBe(503)
    expect(JSON.stringify(await response.json())).not.toContain('secret-body')
    spy.mockRestore()
  })
})
