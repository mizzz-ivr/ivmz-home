import { readdirSync } from 'node:fs'

import { describe, expect, it, vi } from 'vitest'

import payloadAuthRateLimit, { config } from '../../netlify/edge-functions/payload-auth-rate-limit'

describe('Payload authentication rate-limit edge function', () => {
  it('limits credential submissions without counting GET/HEAD preflight requests', () => {
    expect(config).toEqual({
      path: '/api/users/login',
      method: 'POST',
      rateLimit: {
        action: 'rate_limit',
        windowLimit: 10,
        windowSize: 60,
        aggregateBy: ['ip', 'domain'],
      },
    })
  })

  it('keeps the Netlify Free-plan limit of two code-based edge rate-limit rules', () => {
    const rateLimitFiles = readdirSync(new URL('../../netlify/edge-functions/', import.meta.url))
      .filter((file) => file.endsWith('-rate-limit.ts'))
      .sort()

    expect(rateLimitFiles).toEqual(['contact-rate-limit.ts', 'payload-auth-rate-limit.ts'])
  })

  it('delegates allowed requests to the Payload authentication handler', async () => {
    const response = new Response(null, { status: 401 })
    const next = vi.fn().mockResolvedValue(response)

    await expect(
      payloadAuthRateLimit(
        new Request('https://ivmz.ivrm.jp/api/users/login', { method: 'POST' }),
        { next },
      ),
    ).resolves.toBe(response)

    expect(next).toHaveBeenCalledOnce()
  })
})
