import { describe, expect, it, vi } from 'vitest'

import contactRateLimit, { config } from './contact-rate-limit'

describe('contact rate-limit edge function', () => {
  it('applies a narrow rate limit to the contact endpoint', () => {
    expect(config).toEqual({
      path: '/api/contact',
      rateLimit: {
        action: 'rate_limit',
        windowLimit: 5,
        windowSize: 60,
        aggregateBy: ['ip', 'domain'],
      },
    })
  })

  it('delegates accepted traffic to the application route', async () => {
    const response = new Response('ok')
    const next = vi.fn().mockResolvedValue(response)

    await expect(
      contactRateLimit(new Request('https://ivmz.ivrm.jp/api/contact'), { next }),
    ).resolves.toBe(response)

    expect(next).toHaveBeenCalledOnce()
  })
})
