import type { MetadataRoute } from 'next'

import { resolveCanonicalUrl } from '@/lib/metadata'
import { getNewsListContent, getPostsListContent, getWorksListContent } from '@/lib/public-list-content'
import { site } from '@/lib/site'

export const revalidate = 300

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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = staticRoutes.map((path) => ({
    url: new URL(path, site.url).toString(),
    changeFrequency: path === '/' ? 'weekly' : 'monthly',
    priority: path === '/' ? 1 : path.startsWith('/legal/') ? 0.3 : 0.7,
  }))

  // Keep these sequential: the Netlify runtime intentionally limits Payload/PostgreSQL concurrency.
  const works = await getWorksListContent(1_000)
  const posts = await getPostsListContent(1_000)
  const news = await getNewsListContent(1_000)

  for (const work of works.items) {
    const path = `/works/${encodeURIComponent(work.slug)}`
    entries.push({
      url: new URL(path, site.url).toString(),
      lastModified: work.publishedAt ?? work.updatedAt,
      changeFrequency: 'monthly',
      priority: 0.7,
    })
  }

  for (const post of posts.items) {
    const path = `/blog/${encodeURIComponent(post.slug)}`
    const internalCanonical = new URL(path, site.url).toString()
    if (resolveCanonicalUrl(path, post.canonicalUrl) !== internalCanonical) continue

    entries.push({
      url: internalCanonical,
      lastModified: post.publishedAt ?? post.updatedAt,
      changeFrequency: 'monthly',
      priority: 0.6,
    })
  }

  for (const item of news.items) {
    const path = `/news/${encodeURIComponent(item.slug)}`
    entries.push({
      url: new URL(path, site.url).toString(),
      lastModified: item.publishedAt ?? item.updatedAt,
      changeFrequency: 'monthly',
      priority: 0.5,
    })
  }

  return entries
}
