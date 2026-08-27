export function normalizePublicHttpUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null

  const trimmed = value.trim()
  if (trimmed.length === 0) return null

  try {
    const url = new URL(trimmed)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null
  } catch {
    return null
  }
}

export function normalizePublicStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []

  return value.flatMap((item) => {
    if (typeof item !== 'string') return []
    const trimmed = item.trim()
    return trimmed.length > 0 ? [trimmed] : []
  })
}

export function compactPublicText(value: unknown, maxLength = 260): string {
  const text = typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : ''
  if (maxLength <= 0) return ''
  return text.length > maxLength ? `${text.slice(0, Math.max(0, maxLength - 1))}…` : text
}

export function formatPublicDateTime(value: unknown, timezone: unknown): string | null {
  if (typeof value !== 'string' || value.length === 0) return null
  if (typeof timezone !== 'string' || timezone.length === 0) return null

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  try {
    return new Intl.DateTimeFormat('ja-JP', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: timezone,
    }).format(date)
  } catch {
    return null
  }
}
