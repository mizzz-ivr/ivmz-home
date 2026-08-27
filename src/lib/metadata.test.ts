import { describe, expect, it } from 'vitest'

import { resolveCanonicalUrl } from '@/lib/metadata'

describe('canonical URL resolution', () => {
  it('uses the production site URL for internal routes', () => {
    expect(resolveCanonicalUrl('/works/example')).toBe('https://ivmz.ivrm.jp/works/example')
  })

  it('honors an explicit HTTP(S) canonical URL', () => {
    expect(resolveCanonicalUrl('/blog/example', 'https://example.com/articles/example')).toBe(
      'https://example.com/articles/example',
    )
  })

  it('falls back to the internal canonical for unsafe or malformed values', () => {
    expect(resolveCanonicalUrl('/blog/example', 'javascript:alert(1)')).toBe(
      'https://ivmz.ivrm.jp/blog/example',
    )
    expect(resolveCanonicalUrl('/blog/example', 'not a url')).toBe(
      'https://ivmz.ivrm.jp/blog/example',
    )
  })
})
