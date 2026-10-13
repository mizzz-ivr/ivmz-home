import { describe, expect, it, vi } from 'vitest'

import { getTurnstileSecret, verifyTurnstile } from './turnstile'

const ok = () => new Response(JSON.stringify({ success: true }), { status: 200 })

describe('verifyTurnstile', () => {
  it('is skipped when no secret is configured', async () => {
    const fetcher = vi.fn()
    expect(await verifyTurnstile(undefined, '1.1.1.1', { fetcher, secret: undefined })).toBe(
      'skipped',
    )
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('rejects missing, empty, non-string and oversized tokens without a network call', async () => {
    const fetcher = vi.fn()
    for (const token of [undefined, '', 42, {}, 'x'.repeat(3_000)]) {
      expect(await verifyTurnstile(token, null, { fetcher, secret: 's' })).toBe('failed')
    }
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('posts secret, response and remote ip to the fixed endpoint', async () => {
    const fetcher = vi.fn().mockResolvedValue(ok())
    expect(await verifyTurnstile('tok', '1.2.3.4', { fetcher, secret: 'sec' })).toBe('ok')

    const [url, init] = fetcher.mock.calls[0]
    expect(url).toBe('https://challenges.cloudflare.com/turnstile/v0/siteverify')
    expect(init.method).toBe('POST')
    expect(init.body.get('secret')).toBe('sec')
    expect(init.body.get('response')).toBe('tok')
    expect(init.body.get('remoteip')).toBe('1.2.3.4')
  })

  it('fails closed on rejected tokens, HTTP errors and network failures', async () => {
    const options = { secret: 's' }
    expect(
      await verifyTurnstile('t', null, {
        ...options,
        fetcher: vi.fn().mockResolvedValue(new Response('{"success":false}', { status: 200 })),
      }),
    ).toBe('failed')
    expect(
      await verifyTurnstile('t', null, {
        ...options,
        fetcher: vi.fn().mockResolvedValue(new Response('', { status: 500 })),
      }),
    ).toBe('failed')
    expect(
      await verifyTurnstile('t', null, {
        ...options,
        fetcher: vi.fn().mockRejectedValue(new Error('down')),
      }),
    ).toBe('failed')
  })
})

describe('getTurnstileSecret', () => {
  it('is on for production and local runs when a secret exists', () => {
    expect(getTurnstileSecret({ CONTEXT: 'production', TURNSTILE_SECRET_KEY: 's' })).toBe('s')
    expect(getTurnstileSecret({ TURNSTILE_SECRET_KEY: 's' })).toBe('s')
  })

  it('is off for deploy previews and branch deploys', () => {
    expect(
      getTurnstileSecret({ CONTEXT: 'deploy-preview', TURNSTILE_SECRET_KEY: 's' }),
    ).toBeUndefined()
    expect(
      getTurnstileSecret({ CONTEXT: 'branch-deploy', TURNSTILE_SECRET_KEY: 's' }),
    ).toBeUndefined()
    expect(
      getTurnstileSecret({
        CONTEXT: 'production',
        PAYLOAD_BUILD_CONTEXT: 'deploy-preview',
        TURNSTILE_SECRET_KEY: 's',
      }),
    ).toBeUndefined()
  })

  it('is off without a secret', () => {
    expect(getTurnstileSecret({ CONTEXT: 'production' })).toBeUndefined()
  })
})
