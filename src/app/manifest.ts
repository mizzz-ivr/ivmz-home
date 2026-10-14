import type { MetadataRoute } from 'next'

import { site } from '@/lib/site'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: site.name,
    short_name: site.shortName,
    description: site.description,
    lang: 'ja',
    start_url: '/',
    display: 'browser',
    background_color: '#080811',
    theme_color: '#080811',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
  }
}
