import type { ContactCategory } from '@/lib/contact-routing'

export const contactCategories = [
  'personal',
  'development',
  'job',
  'collaboration',
  'media',
  'community',
  'team',
  'security',
] as const satisfies readonly ContactCategory[]

export type ContactSubmission = {
  category: ContactCategory
  email: string
  message: string
  name: string
  /** Client-generated idempotency key; reused when the same submission is retried. */
  requestId?: string
  subject: string
}

export type ContactField = 'attachments' | 'category' | 'email' | 'message' | 'name' | 'subject'

export type ContactValidationErrors = Partial<Record<ContactField, string>>

export type ContactSubmissionParseResult =
  | {
      kind: 'valid'
      value: ContactSubmission
    }
  | {
      kind: 'honeypot'
    }
  | {
      errors: ContactValidationErrors
      kind: 'invalid'
    }

export const CONTACT_BODY_LIMIT_BYTES = 16 * 1024

const limits = {
  email: 254,
  message: 8_000,
  name: 80,
  subject: 160,
} as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value : ''
}

function normalizeSingleLine(value: unknown) {
  return stringValue(value)
    .trim()
    .replace(/[ \t]+/g, ' ')
}

function normalizeMessage(value: unknown) {
  return stringValue(value).replace(/\r\n?/g, '\n').trim()
}

function containsHeaderBreak(value: string) {
  return /[\r\n\0]/.test(value)
}

function isEmail(value: string) {
  if (!value || value.length > limits.email || containsHeaderBreak(value)) {
    return false
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function parseRequestId(value: unknown) {
  const candidate = normalizeSingleLine(value)
  return UUID_PATTERN.test(candidate) ? candidate.toLowerCase() : undefined
}

function isCategory(value: string): value is ContactCategory {
  return contactCategories.includes(value as ContactCategory)
}

export function parseContactSubmission(input: unknown): ContactSubmissionParseResult {
  if (!isRecord(input)) {
    return {
      kind: 'invalid',
      errors: {
        message: '送信内容を確認してください。',
      },
    }
  }

  if (normalizeSingleLine(input.website)) {
    return { kind: 'honeypot' }
  }

  const category = normalizeSingleLine(input.category)
  const email = normalizeSingleLine(input.email)
  const message = normalizeMessage(input.message)
  const name = normalizeSingleLine(input.name)
  const subject = normalizeSingleLine(input.subject)
  const requestId = parseRequestId(input.requestId)

  const errors: ContactValidationErrors = {}

  if (!name) {
    errors.name = 'お名前を入力してください。'
  } else if (name.length > limits.name || containsHeaderBreak(name)) {
    errors.name = `お名前は${limits.name}文字以内で入力してください。`
  }

  if (!isEmail(email)) {
    errors.email = '有効なメールアドレスを入力してください。'
  }

  if (!isCategory(category)) {
    errors.category = '問い合わせカテゴリを選択してください。'
  }

  if (!subject) {
    errors.subject = '件名を入力してください。'
  } else if (subject.length > limits.subject || containsHeaderBreak(subject)) {
    errors.subject = `件名は${limits.subject}文字以内の1行で入力してください。`
  }

  if (!message) {
    errors.message = '問い合わせ内容を入力してください。'
  } else if (message.length > limits.message) {
    errors.message = `問い合わせ内容は${limits.message.toLocaleString('ja-JP')}文字以内で入力してください。`
  }

  if (Object.keys(errors).length > 0 || !isCategory(category)) {
    return { kind: 'invalid', errors }
  }

  return {
    kind: 'valid',
    value: {
      category,
      email,
      message,
      name,
      ...(requestId ? { requestId } : {}),
      subject,
    },
  }
}
