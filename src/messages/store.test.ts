import { describe, expect, it } from 'vitest'

import { anonymousClientDigest } from './store'

const request = (headers: Record<string, string>) =>
  new Request('https://ivmz.ivrm.jp/api/message', { headers })

describe('durable rate limit IP partition key', () => {
  const secret = 'long-dedicated-hmac-key-for-anonymous-messages-2026'
  it('derives an opaque stable HMAC without saving the raw IP', () => {
    const first = anonymousClientDigest(
      request({ 'x-nf-client-connection-ip': '203.0.113.10' }),
      secret,
    )
    expect(first).toMatch(/^[0-9a-f]{64}$/)
    expect(first).toBe(
      anonymousClientDigest(request({ 'x-nf-client-connection-ip': '203.0.113.10' }), secret),
    )
    expect(first).not.toContain('203.0.113.10')
    expect(first).not.toBe(
      anonymousClientDigest(request({ 'x-nf-client-connection-ip': '203.0.113.11' }), secret),
    )
  })
  it('fails closed for spoofed forwarded IPs, invalid connection IPs, and short secret', () => {
    expect(anonymousClientDigest(request({ 'x-forwarded-for': '192.0.2.1' }), secret)).toBeNull()
    expect(
      anonymousClientDigest(request({ 'x-nf-client-connection-ip': '1.2.3.4, 5.6.7.8' }), secret),
    ).toBeNull()
    expect(
      anonymousClientDigest(request({ 'x-nf-client-connection-ip': '1.2.3.4' }), 'short'),
    ).toBeNull()
  })
})
