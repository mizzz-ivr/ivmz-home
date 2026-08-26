import type { Field } from 'payload'

const slugPattern = /^[\p{Letter}\p{Number}]+(?:-[\p{Letter}\p{Number}]+)*$/u

export function normalizeSlug(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .trim()
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
}

export function createSlugField(sourceField = 'title'): Field {
  return {
    name: 'slug',
    type: 'text',
    index: true,
    required: true,
    unique: true,
    admin: {
      description: 'URL path segment. A value is generated from the title when left blank.',
    },
    hooks: {
      beforeValidate: [
        ({ siblingData, value }) => {
          const source =
            typeof value === 'string' && value.trim().length > 0
              ? value
              : siblingData?.[sourceField]

          return typeof source === 'string' ? normalizeSlug(source) : value
        },
      ],
    },
    validate: (value: unknown) => {
      if (typeof value !== 'string' || value.length === 0) return 'Slug is required.'
      return slugPattern.test(value) || 'Use letters, numbers, and single hyphens only.'
    },
  }
}

export function validateOptionalHttpUrl(value: unknown): true | string {
  if (value === null || value === undefined || value === '') return true
  if (typeof value !== 'string') return 'Enter a valid HTTP or HTTPS URL.'

  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
      ? true
      : 'Only HTTP and HTTPS URLs are allowed.'
  } catch {
    return 'Enter a valid HTTP or HTTPS URL.'
  }
}

export function validateRequiredHttpUrl(value: unknown): true | string {
  if (value === null || value === undefined || value === '') return 'URL is required.'
  return validateOptionalHttpUrl(value)
}

export function validateIanaTimezone(value: unknown): true | string {
  if (typeof value !== 'string' || value.length === 0) return 'Timezone is required.'

  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format(new Date(0))
    return true
  } catch {
    return 'Enter a valid IANA timezone such as Asia/Tokyo.'
  }
}
