import type { Metadata } from 'next'

import { site } from '@/lib/site'

type PageMetadataInput = {
  title: string
  description: string
  path: string
  canonicalUrl?: string | null
}

export function resolveCanonicalUrl(path: string, canonicalUrl?: string | null) {
  const fallback = new URL(path, site.url).toString()
  if (!canonicalUrl) return fallback

  try {
    const candidate = new URL(canonicalUrl)
    if (candidate.protocol === 'http:' || candidate.protocol === 'https:') {
      return candidate.toString()
    }
  } catch {
    // Invalid CMS data must never make metadata generation fail.
  }

  return fallback
}

export function createPageMetadata({
  title,
  description,
  path,
  canonicalUrl,
}: PageMetadataInput): Metadata {
  const canonical = resolveCanonicalUrl(path, canonicalUrl)

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: 'website',
      url: canonical,
      title: `${title} | ${site.shortName}`,
      description,
      siteName: site.shortName,
    },
  }
}
