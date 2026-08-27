import { describe, expect, it } from 'vitest'

import {
  createBlogStructuredData,
  createNewsStructuredData,
  createSiteStructuredData,
  createWorkStructuredData,
  hasExternalCanonical,
  serializeStructuredData,
} from './structured-data'

describe('structured data', () => {
  it('escapes script-breaking CMS strings before rendering JSON-LD', () => {
    const serialized = serializeStructuredData({
      headline: '</script><script>alert("xss")</script>&\u2028next',
    })

    expect(serialized).not.toContain('<')
    expect(serialized).not.toContain('>')
    expect(serialized).not.toContain('&')
    expect(serialized).toContain('\\u003c/script\\u003e')
    expect(serialized).toContain('\\u0026')
    expect(serialized).toContain('\\u2028')
  })

  it('publishes only repository-backed identity URLs in site JSON-LD', () => {
    const data = createSiteStructuredData()
    const serialized = JSON.stringify(data)

    expect(serialized).toContain('https://ivmz.ivrm.jp')
    expect(serialized).toContain('https://github.com/mizzz-ivr')
    expect(serialized).toContain('いゔる。 a.k.a. mizzz（ずーみー）')
  })

  it('uses generic CreativeWork for works instead of assuming software type', () => {
    const data = createWorkStructuredData({
      slug: 'example-work',
      title: 'Example Work',
      summary: 'Example summary',
      stack: ['Next.js', 'TypeScript'],
      publishedAt: '2026-08-27T00:00:00.000Z',
    })

    expect(data).toMatchObject({
      '@type': 'CreativeWork',
      url: 'https://ivmz.ivrm.jp/works/example-work',
      name: 'Example Work',
      keywords: ['Next.js', 'TypeScript'],
    })
  })

  it('emits BlogPosting only when the internal detail page is canonical', () => {
    const internal = createBlogStructuredData({
      slug: 'internal-post',
      title: 'Internal post',
      excerpt: 'Internal excerpt',
      canonicalUrl: 'https://ivmz.ivrm.jp/blog/internal-post',
      publishedAt: '2026-08-27T00:00:00.000Z',
    })
    const external = createBlogStructuredData({
      slug: 'external-post',
      title: 'External post',
      excerpt: 'External excerpt',
      canonicalUrl: 'https://qiita.com/example/items/123',
    })

    expect(internal).toMatchObject({
      '@type': 'BlogPosting',
      url: 'https://ivmz.ivrm.jp/blog/internal-post',
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': 'https://ivmz.ivrm.jp/blog/internal-post',
      },
    })
    expect(external).toBeNull()
    expect(hasExternalCanonical('/blog/external-post', 'https://qiita.com/example/items/123')).toBe(
      true,
    )
  })

  it('treats an internal canonical with a trailing slash as the same page', () => {
    expect(
      hasExternalCanonical('/blog/internal-post', 'https://ivmz.ivrm.jp/blog/internal-post/'),
    ).toBe(false)
  })

  it('keeps malformed canonical CMS values on the safe internal fallback', () => {
    expect(hasExternalCanonical('/blog/post', 'not a url')).toBe(false)
  })

  it('uses generic Article for news content', () => {
    const data = createNewsStructuredData({
      slug: 'release-note',
      title: 'Release note',
      description: 'A release update',
      publishedAt: '2026-08-27T00:00:00.000Z',
    })

    expect(data).toMatchObject({
      '@type': 'Article',
      url: 'https://ivmz.ivrm.jp/news/release-note',
      headline: 'Release note',
    })
  })
})
