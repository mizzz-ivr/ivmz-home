import { describe, expect, it, vi } from 'vitest'

import contactRateLimit, { config } from '../../netlify/edge-functions/contact-rate-limit'

describe('contact rate-limit edge function', () => {
  it('shares a narrow POST limit between contact and chat on the Free plan', () => {
    expect(config).toEqual({
      path: ['/api/contact', '/api/chat'],
      method: 'POST',
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
