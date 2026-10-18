import { describe, expect, it } from 'vitest'

import {
  ANONYMOUS_MESSAGE_BODY_LIMIT_BYTES,
  ANONYMOUS_MESSAGE_MAX_CHARACTERS,
  anonymousMessageCharacterCount,
  parseAnonymousMessageSubmission,
} from './schema'

const requestId = '3f2b8f0e-1c52-4c1e-9b8a-6a1d2e5f7c90'

describe('anonymous message submission', () => {
  it('accepts an anonymous message and normalizes CRLF and whitespace', () => {
    expect(
      parseAnonymousMessageSubmission({ message: '  こんにちは\r\nありがとう  ', requestId }),
    ).toEqual({
      kind: 'valid',
      value: { message: 'こんにちは\nありがとう', requestId },
    })
  })

  it('does not allow the client to set status, reply, publication, or internal notes', () => {
    expect(
      parseAnonymousMessageSubmission({
        message: '本文',
        requestId,
        isPublic: true,
        status: 'replied',
        reply: '偽装返信',
        internalNote: '外部入力',
      }),
    ).toEqual({ kind: 'valid', value: { message: '本文', requestId } })
  })

  it('supports 300 grapheme clusters including emoji, but rejects 301', () => {
    expect(anonymousMessageCharacterCount('👨‍👩‍👧‍👦')).toBe(1)
    expect(ANONYMOUS_MESSAGE_MAX_CHARACTERS).toBe(300)
    expect(parseAnonymousMessageSubmission({ message: '🙂'.repeat(300), requestId }).kind).toBe(
      'valid',
    )
    expect(
      parseAnonymousMessageSubmission({ message: '🙂'.repeat(301), requestId }),
    ).toMatchObject({ kind: 'invalid', errors: { message: expect.any(String) } })
  })

  it('rejects blank messages, non-string messages and unsupported control characters', () => {
    for (const message of [' \r\n ', 123, 'hello\u0000world']) {
      expect(parseAnonymousMessageSubmission({ message, requestId })).toMatchObject({
        kind: 'invalid',
        errors: { message: expect.any(String) },
      })
    }
  })

  it('requires a valid v4 idempotency key rather than silently creating a new one', () => {
    for (const id of [undefined, 'not-a-uuid', '3f2b8f0e-1c52-1c1e-9b8a-6a1d2e5f7c90']) {
      expect(
        parseAnonymousMessageSubmission({ message: '本文', requestId: id }),
      ).toMatchObject({ kind: 'invalid', errors: { requestId: expect.any(String) } })
    }
  })

  it('keeps a previously used idempotency key unchanged on retry', () => {
    const input = { message: '本文', requestId }
    expect(parseAnonymousMessageSubmission(input)).toEqual(parseAnonymousMessageSubmission(input))
  })

  it('silently classifies honeypot input without persisting it', () => {
    expect(
      parseAnonymousMessageSubmission({
        message: '本文',
        requestId,
        website: 'https://example.invalid',
      }),
    ).toEqual({ kind: 'honeypot' })
  })

  it('treats visitor HTML as plain data rather than sanitizing into different content', () => {
    const message = '<script>alert(1)</script>'
    expect(parseAnonymousMessageSubmission({ message, requestId })).toEqual({
      kind: 'valid',
      value: { message, requestId },
    })
  })

  it('reserves a small request-size budget to be enforced before JSON parsing', () => {
    expect(ANONYMOUS_MESSAGE_BODY_LIMIT_BYTES).toBe(4096)
  })
})
