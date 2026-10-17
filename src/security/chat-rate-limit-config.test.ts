import { describe, expect, it, vi } from 'vitest'

import chatRateLimit, { config } from '../../netlify/edge-functions/chat-rate-limit'

describe('chat edge rate limit', () => {
  it('protects only AI POST requests and uses a shared IP-based Netlify limit', () => {
    expect(config).toEqual({
      path: '/api/chat',
      method: 'POST',
      rateLimit: {
        action: 'rate_limit',
        windowLimit: 12,
        windowSize: 60,
        aggregateBy: ['ip', 'domain'],
      },
    })
  })

  it('passes accepted traffic to the API without touching the request body', async () => {
    const response = new Response('ok')
    const next = vi.fn().mockResolvedValue(response)

    await expect(
      chatRateLimit(new Request('https://ivmz.ivrm.jp/api/chat'), { next }),
    ).resolves.toBe(response)
    expect(next).toHaveBeenCalledOnce()
  })
})
