import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { describe, expect, it, vi } from 'vitest'

import contactRateLimit, { config } from '../../netlify/edge-functions/contact-rate-limit'

describe('shared chat/contact edge rate limit', () => {
  it('never exceeds the two code-based Edge rate limits allowed on the Free plan', () => {
    const edgeDir = fileURLToPath(new URL('../../netlify/edge-functions/', import.meta.url))
    const files = readdirSync(edgeDir)
      .filter((filename) => filename.endsWith('.ts'))
      .filter((filename) => {
        const source = readFileSync(new URL(`../../netlify/edge-functions/${filename}`, import.meta.url), 'utf8')
        return /\\brateLimit:\\s*\\{/.test(source)
      })
      .sort()
    expect(files).toEqual(['contact-rate-limit.ts', 'payload-auth-rate-limit.ts'])
  })

  it('protects only AI POST requests and uses a shared IP-based Netlify limit', () => {
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

  it('passes accepted traffic to the API without touching the request body', async () => {
    const response = new Response('ok')
    const next = vi.fn().mockResolvedValue(response)

    await expect(
      contactRateLimit(new Request('https://ivmz.ivrm.jp/api/chat'), { next }),
    ).resolves.toBe(response)
    expect(next).toHaveBeenCalledOnce()
  })
})
