import { describe, expect, it } from 'vitest'

import { CONTACT_BODY_LIMIT_BYTES, parseContactSubmission } from './schema'

const validSubmission = {
  category: 'development',
  email: 'visitor@example.com',
  message: 'Next.jsについて相談したいです。',
  name: 'Visitor',
  subject: 'Development inquiry',
  website: '',
}

describe('parseContactSubmission', () => {
  it('normalizes a valid submission', () => {
    expect(
      parseContactSubmission({
        ...validSubmission,
        message: 'line 1\r\nline 2',
        name: '  Visitor   Name  ',
      }),
    ).toEqual({
      kind: 'valid',
      value: {
        category: 'development',
        email: 'visitor@example.com',
        message: 'line 1\nline 2',
        name: 'Visitor Name',
        subject: 'Development inquiry',
      },
    })
  })

  it('rejects client-controlled recipient fields by ignoring them', () => {
    const result = parseContactSubmission({
      ...validSubmission,
      recipient: 'attacker@example.com',
    })

    expect(result.kind).toBe('valid')
    if (result.kind === 'valid') {
      expect(result.value).not.toHaveProperty('recipient')
    }
  })

  it('rejects malformed fields and header injection attempts', () => {
    const result = parseContactSubmission({
      ...validSubmission,
      email: 'visitor@example.com\r\nBcc: attacker@example.com',
      subject: 'hello\nBcc: attacker@example.com',
    })

    expect(result).toEqual({
      kind: 'invalid',
      errors: {
        email: '有効なメールアドレスを入力してください。',
        subject: '件名は160文字以内の1行で入力してください。',
      },
    })
  })

  it('classifies a populated honeypot without exposing validation detail', () => {
    expect(
      parseContactSubmission({
        ...validSubmission,
        website: 'https://bot.example',
      }),
    ).toEqual({ kind: 'honeypot' })
  })

  it('keeps the raw request body limit intentionally small', () => {
    expect(CONTACT_BODY_LIMIT_BYTES).toBe(16 * 1024)
  })
})
