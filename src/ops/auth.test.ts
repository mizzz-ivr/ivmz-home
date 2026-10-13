import { describe, expect, it } from 'vitest'

import { hasValidOpsToken } from './auth'

const token = 'a'.repeat(32)
const request = (authorization?: string) =>
  new Request('https://example.test/api/ops/health', {
    headers: authorization ? { authorization } : {},
  })

describe('hasValidOpsToken', () => {
  it('accepts only the exact bearer token', () => {
    expect(hasValidOpsToken(request(`Bearer ${token}`), token)).toBe(true)
    expect(hasValidOpsToken(request(`bearer ${token}`), token)).toBe(true)
    expect(hasValidOpsToken(request(`Bearer ${token}x`), token)).toBe(false)
    expect(hasValidOpsToken(request(token), token)).toBe(false)
    expect(hasValidOpsToken(request(), token)).toBe(false)
  })

  it('is disabled when no (or a too short) token is configured', () => {
    expect(hasValidOpsToken(request('Bearer abc'), undefined)).toBe(false)
    expect(hasValidOpsToken(request('Bearer abc'), 'abc')).toBe(false)
    expect(hasValidOpsToken(request('Bearer '), '')).toBe(false)
  })
})
