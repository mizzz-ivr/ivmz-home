import { describe, expect, it, vi } from 'vitest'

import contactAttachmentsRateLimit, {
  config,
} from '../../netlify/edge-functions/contact-attachments-rate-limit'

describe('contact attachments rate-limit edge function', () => {
  it('bounds upload start, policy and scan polling (not the admin download)', () => {
    expect(config.path).toEqual([
      '/api/contact/attachments',
      '/api/contact/attachments/policy',
      '/api/contact/attachments/finalize',
    ])
    expect(config.path).not.toContain('/api/contact/attachments/download')
    expect(config.rateLimit).toEqual({
      action: 'rate_limit',
      aggregateBy: ['ip', 'domain'],
      windowLimit: 120,
      windowSize: 60,
    })
  })

  it('delegates accepted traffic to the application route', async () => {
    const response = new Response('ok')
    const next = vi.fn().mockResolvedValue(response)

    await expect(
      contactAttachmentsRateLimit(new Request('https://ivmz.ivrm.jp/api/contact/attachments'), {
        next,
      }),
    ).resolves.toBe(response)
    expect(next).toHaveBeenCalledOnce()
  })
})
