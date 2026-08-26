import { describe, expect, it } from 'vitest'

import { isPayloadUnauthorizedError } from './payload-authorization'

describe('isPayloadUnauthorizedError', () => {
  it('recognizes Payload UnauthorizedError variants', () => {
    expect(isPayloadUnauthorizedError({ status: 401 })).toBe(true)
    expect(isPayloadUnauthorizedError({ name: 'UnauthorizedError' })).toBe(true)
    expect(isPayloadUnauthorizedError(new Error('Unauthorized'))).toBe(true)
  })

  it('does not hide unrelated server errors', () => {
    expect(isPayloadUnauthorizedError(new Error('database connection failed'))).toBe(false)
    expect(isPayloadUnauthorizedError({ status: 500, message: 'Something went wrong.' })).toBe(
      false,
    )
  })
})
