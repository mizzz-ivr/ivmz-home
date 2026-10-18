/** Server-side input contract for the future /api/message handler (Issue #69). */
export const ANONYMOUS_MESSAGE_BODY_LIMIT_BYTES = 4 * 1024
export const ANONYMOUS_MESSAGE_MAX_CHARACTERS = 300

export type AnonymousMessageInput = {
  message: string
  /** Client generated UUID v4, reused unchanged on retries. */
  requestId: string
}

type ValidationErrors = Partial<Record<'message' | 'requestId', string>>

export type AnonymousMessageParseResult =
  | { kind: 'valid'; value: AnonymousMessageInput }
  | { kind: 'honeypot' }
  | { kind: 'invalid'; errors: ValidationErrors }

const UUID_V4 = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i
const graphemeSegmenter = new Intl.Segmenter('ja', { granularity: 'grapheme' })

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function anonymousMessageCharacterCount(message: string): number {
  let count = 0
  for (const _segment of graphemeSegmenter.segment(message)) {
    count += 1
  }
  return count
}

function containsUnsupportedControls(value: string): boolean {
  for (const character of value) {
    const code = character.codePointAt(0)
    if (code !== undefined && ((code < 32 && code !== 9 && code !== 10) || code === 127)) {
      return true
    }
  }
  return false
}

/**
 * Returns only fields the anonymous API may persist.
 * Not a substitute for size limits, Turnstile, Origin checks, or durable rate limiting.
 */
export function parseAnonymousMessageSubmission(input: unknown): AnonymousMessageParseResult {
  if (!isRecord(input)) {
    return { kind: 'invalid', errors: { message: '送信内容を確認してください。' } }
  }

  if (typeof input.website === 'string' && input.website.trim()) {
    return { kind: 'honeypot' }
  }

  const message =
    typeof input.message === 'string' ? input.message.replace(/\r\n?/g, '\n').trim() : ''
  const requestId =
    typeof input.requestId === 'string' ? input.requestId.trim().toLowerCase() : ''
  const errors: ValidationErrors = {}

  if (!message) {
    errors.message = 'メッセージを入力してください。'
  } else if (anonymousMessageCharacterCount(message) > ANONYMOUS_MESSAGE_MAX_CHARACTERS) {
    errors.message = `メッセージは${ANONYMOUS_MESSAGE_MAX_CHARACTERS}文字以内で入力してください。`
  } else if (containsUnsupportedControls(message)) {
    errors.message = '使用できない制御文字が含まれています。'
  }

  if (!UUID_V4.test(requestId)) {
    errors.requestId = '送信識別子が無効です。画面を再読み込みしてください。'
  }

  if (Object.keys(errors).length > 0) {
    return { kind: 'invalid', errors }
  }

  return { kind: 'valid', value: { message, requestId } }
}
