import { beforeEach, describe, expect, it } from 'vitest'

import { clientKey, isRateLimited, resetRateLimitsForTests } from './rate-limit'

const request = (ip: string) =>
  new Request('https://ivmz.ivrm.jp/api/contact/attachments', {
    headers: { 'x-nf-client-connection-ip': ip },
  })

describe('attachment rate limit', () => {
  beforeEach(resetRateLimitsForTests)

  it('allows up to the limit per client and window, then blocks', () => {
    for (let index = 0; index < 3; index += 1) {
      expect(isRateLimited('init', request('1.1.1.1'), 3, 1_000)).toBe(false)
    }
    expect(isRateLimited('init', request('1.1.1.1'), 3, 1_000)).toBe(true)
  })

  it('tracks clients and scopes separately', () => {
    isRateLimited('init', request('1.1.1.1'), 1, 1_000)
    expect(isRateLimited('init', request('1.1.1.1'), 1, 1_000)).toBe(true)
    expect(isRateLimited('init', request('2.2.2.2'), 1, 1_000)).toBe(false)
    expect(isRateLimited('finalize', request('1.1.1.1'), 1, 1_000)).toBe(false)
  })

  it('opens a new window after it expires', () => {
    isRateLimited('init', request('1.1.1.1'), 1, 1_000)
    expect(isRateLimited('init', request('1.1.1.1'), 1, 1_000)).toBe(true)
    expect(isRateLimited('init', request('1.1.1.1'), 1, 61_001)).toBe(false)
  })

  it('prefers the Netlify client IP over a spoofable forwarded header', () => {
    const forged = new Request('https://ivmz.ivrm.jp/x', {
      headers: { 'x-forwarded-for': '9.9.9.9', 'x-nf-client-connection-ip': '1.1.1.1' },
    })
    expect(clientKey(forged)).toBe('1.1.1.1')
  })
})
