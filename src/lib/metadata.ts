import type { Metadata } from 'next'

import { site } from '@/lib/site'

type PageMetadataInput = {
  title: string
  description: string
  path: string
}

export function createPageMetadata({ title, description, path }: PageMetadataInput): Metadata {
  const canonical = new URL(path, site.url).toString()

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
