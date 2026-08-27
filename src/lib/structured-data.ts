import { resolveCanonicalUrl } from '@/lib/metadata'
import { site } from '@/lib/site'

export type StructuredDataPrimitive = string | number | boolean | null
export type StructuredDataValue =
  | StructuredDataPrimitive
  | StructuredDataValue[]
  | { [key: string]: StructuredDataValue | undefined }

const personId = `${site.url}/#person`
const websiteId = `${site.url}/#website`

function optionalDate(value?: string | null) {
  if (!value) return undefined
  return Number.isNaN(new Date(value).getTime()) ? undefined : value
}

function internalUrl(path: string) {
  return new URL(path, site.url).toString()
}

function normalizePathname(pathname: string) {
  const normalized = pathname.replace(/\/+$/, '')
  return normalized || '/'
}

export function hasExternalCanonical(path: string, canonicalUrl?: string | null) {
  if (!canonicalUrl) return false

  const canonical = new URL(resolveCanonicalUrl(path, canonicalUrl))
  const internal = new URL(path, site.url)
  return (
    canonical.origin !== internal.origin ||
    normalizePathname(canonical.pathname) !== normalizePathname(internal.pathname)
  )
}

export function serializeStructuredData(data: StructuredDataValue) {
  return JSON.stringify(data).replace(/[<>&\u2028\u2029]/g, (character) => {
    switch (character) {
      case '<':
        return '\\u003c'
      case '>':
        return '\\u003e'
      case '&':
        return '\\u0026'
      case '\u2028':
        return '\\u2028'
      case '\u2029':
        return '\\u2029'
      default:
        return character
    }
  })
}

export function createSiteStructuredData(): StructuredDataValue {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': websiteId,
        url: site.url,
        name: site.name,
        description: site.description,
        inLanguage: 'ja',
        publisher: { '@id': personId },
      },
      {
        '@type': 'Person',
        '@id': personId,
        name: site.name,
        alternateName: site.shortName,
        url: site.url,
        sameAs: [site.githubUrl],
      },
    ],
  }
}

export function createWorkStructuredData(work: {
  slug: string
  title: string
  summary: string
  stack?: string[] | null
  publishedAt?: string | null
  githubUrl?: string | null
  liveUrl?: string | null
}): StructuredDataValue {
  const url = internalUrl(`/works/${encodeURIComponent(work.slug)}`)
  const sameAs = [work.githubUrl, work.liveUrl].filter((value): value is string => Boolean(value))

  return {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    '@id': `${url}#creative-work`,
    url,
    name: work.title,
    description: work.summary,
    datePublished: optionalDate(work.publishedAt),
    creator: { '@id': personId },
    isPartOf: { '@id': websiteId },
    keywords: work.stack && work.stack.length > 0 ? work.stack : undefined,
    sameAs: sameAs.length > 0 ? sameAs : undefined,
  }
}

export function createBlogStructuredData(post: {
  slug: string
  title: string
  excerpt: string
  publishedAt?: string | null
  canonicalUrl?: string | null
  tags?: string[] | null
}): StructuredDataValue | null {
  const path = `/blog/${encodeURIComponent(post.slug)}`
  if (hasExternalCanonical(path, post.canonicalUrl)) return null

  const url = internalUrl(path)
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    '@id': `${url}#article`,
    url,
    headline: post.title,
    description: post.excerpt,
    datePublished: optionalDate(post.publishedAt),
    author: { '@id': personId },
    publisher: { '@id': personId },
    isPartOf: { '@id': websiteId },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    keywords: post.tags && post.tags.length > 0 ? post.tags : undefined,
  }
}

export function createNewsStructuredData(item: {
  slug: string
  title: string
  description: string
  publishedAt?: string | null
}): StructuredDataValue {
  const url = internalUrl(`/news/${encodeURIComponent(item.slug)}`)
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    '@id': `${url}#article`,
    url,
    headline: item.title,
    description: item.description,
    datePublished: optionalDate(item.publishedAt),
    author: { '@id': personId },
    publisher: { '@id': personId },
    isPartOf: { '@id': websiteId },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
  }
}
