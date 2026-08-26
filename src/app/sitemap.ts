import type { MetadataRoute } from 'next'
import { site } from '@/lib/site'

const staticRoutes = [
  '/',
  '/about',
  '/works',
  '/blog',
  '/news',
  '/schedule',
  '/contact',
  '/links',
  '/legal/privacy',
  '/legal/terms',
] as const

export default function sitemap(): MetadataRoute.Sitemap {
  return staticRoutes.map((path) => ({
    url: new URL(path, site.url).toString(),
    changeFrequency: path === '/' ? 'weekly' : 'monthly',
    priority: path === '/' ? 1 : path.startsWith('/legal/') ? 0.3 : 0.7,
  }))
}
