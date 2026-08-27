import { describe, expect, it } from 'vitest'

import {
  compactPublicText,
  formatPublicDateTime,
  normalizePublicHttpUrl,
  normalizePublicStringArray,
} from './public-content-safety'

describe('public content safety', () => {
  it('keeps only HTTP(S) URLs at the public rendering boundary', () => {
    expect(normalizePublicHttpUrl('https://example.com/path')).toBe('https://example.com/path')
    expect(normalizePublicHttpUrl('http://example.com')).toBe('http://example.com/')
    expect(normalizePublicHttpUrl('javascript:alert(1)')).toBeNull()
    expect(normalizePublicHttpUrl('mailto:test@example.com')).toBeNull()
    expect(normalizePublicHttpUrl('not a url')).toBeNull()
    expect(normalizePublicHttpUrl(null)).toBeNull()
  })

  it('turns malformed list-like content into a safe string array', () => {
    expect(normalizePublicStringArray([' Next.js ', '', 42, 'TypeScript'])).toEqual([
      'Next.js',
      'TypeScript',
    ])
    expect(normalizePublicStringArray('Next.js')).toEqual([])
    expect(normalizePublicStringArray(null)).toEqual([])
  })

  it('compacts text without interpreting markup', () => {
    expect(compactPublicText('  hello\n  world  ')).toBe('hello world')
    expect(compactPublicText('<script>alert(1)</script>', 12)).toBe('<script>ale…')
    expect(compactPublicText(null)).toBe('')
  })

  it('formats valid zoned times and safely rejects malformed date or timezone values', () => {
    expect(formatPublicDateTime('2026-08-27T03:00:00.000Z', 'Asia/Tokyo')).toContain('2026')
    expect(formatPublicDateTime('not-a-date', 'Asia/Tokyo')).toBeNull()
    expect(formatPublicDateTime('2026-08-27T03:00:00.000Z', 'Tokyo')).toBeNull()
    expect(formatPublicDateTime(null, 'Asia/Tokyo')).toBeNull()
  })
})
