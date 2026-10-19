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
