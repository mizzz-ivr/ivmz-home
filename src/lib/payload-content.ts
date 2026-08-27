import configPromise from '@payload-config'
import { cache } from 'react'
import { getPayload } from 'payload'

import type { News, Post, Schedule, SocialLink, Work } from '@/payload-types'
import { createPublishedSlugWhere } from '@/lib/payload-detail-query'
import {
  normalizePublicHttpUrl,
  normalizePublicStringArray,
} from '@/lib/public-content-safety'

const getContentPayload = cache(() => getPayload({ config: configPromise }))

function sanitizeWork(work: Work): Work {
  return {
    ...work,
    stack: normalizePublicStringArray(work.stack),
    highlights: normalizePublicStringArray(work.highlights),
    githubUrl: normalizePublicHttpUrl(work.githubUrl),
    liveUrl: normalizePublicHttpUrl(work.liveUrl),
  }
}

function sanitizePost(post: Post): Post {
  return {
    ...post,
    tags: normalizePublicStringArray(post.tags),
    canonicalUrl: normalizePublicHttpUrl(post.canonicalUrl),
  }
}

function sanitizeNews(item: News): News {
  return {
    ...item,
    externalUrl: normalizePublicHttpUrl(item.externalUrl),
  }
}

function sanitizeSchedule(item: Schedule): Schedule {
  return {
    ...item,
    url: normalizePublicHttpUrl(item.url),
  }
}

function sanitizeSocialLink(item: SocialLink): SocialLink | null {
  const url = normalizePublicHttpUrl(item.url)
  return url ? { ...item, url } : null
}

export async function getPublishedWorks(limit = 3) {
  const payload = await getContentPayload()
  const result = await payload.find({
    collection: 'works',
    depth: 0,
    draft: false,
    limit,
    overrideAccess: false,
    sort: '-publishedAt',
    where: {
      _status: {
        equals: 'published',
      },
    },
  })

  return { ...result, docs: result.docs.map(sanitizeWork) }
}

export async function getLatestPosts(limit = 3) {
  const payload = await getContentPayload()
  const result = await payload.find({
    collection: 'posts',
    depth: 0,
    draft: false,
    limit,
    overrideAccess: false,
    sort: '-publishedAt',
    where: {
      _status: {
        equals: 'published',
      },
    },
  })

  return { ...result, docs: result.docs.map(sanitizePost) }
}

export async function getLatestNews(limit = 3) {
  const payload = await getContentPayload()
  const result = await payload.find({
    collection: 'news',
    depth: 0,
    draft: false,
    limit,
    overrideAccess: false,
    sort: '-publishedAt',
    where: {
      _status: {
        equals: 'published',
      },
    },
  })

  return { ...result, docs: result.docs.map(sanitizeNews) }
}

export const getPublishedWorkBySlug = cache(async (slug: string) => {
  const payload = await getContentPayload()
  const result = await payload.find({
    collection: 'works',
    depth: 0,
    draft: false,
    limit: 1,
    overrideAccess: false,
    where: createPublishedSlugWhere(slug),
  })
  const work = result.docs[0]

  return work ? sanitizeWork(work) : null
})

export const getPublishedPostBySlug = cache(async (slug: string) => {
  const payload = await getContentPayload()
  const result = await payload.find({
    collection: 'posts',
    depth: 0,
    draft: false,
    limit: 1,
    overrideAccess: false,
    where: createPublishedSlugWhere(slug),
  })
  const post = result.docs[0]

  return post ? sanitizePost(post) : null
})

export const getPublishedNewsBySlug = cache(async (slug: string) => {
  const payload = await getContentPayload()
  const result = await payload.find({
    collection: 'news',
    depth: 0,
    draft: false,
    limit: 1,
    overrideAccess: false,
    where: createPublishedSlugWhere(slug),
  })
  const item = result.docs[0]

  return item ? sanitizeNews(item) : null
})

export async function getUpcomingSchedule(limit = 3, now = new Date()) {
  const payload = await getContentPayload()
  const result = await payload.find({
    collection: 'schedule',
    depth: 0,
    limit,
    overrideAccess: false,
    sort: 'startAt',
    where: {
      and: [
        {
          visibility: {
            equals: 'public',
          },
        },
        {
          startAt: {
            greater_than_equal: now.toISOString(),
          },
        },
      ],
    },
  })

  return { ...result, docs: result.docs.map(sanitizeSchedule) }
}

export async function getEnabledSocialLinks(limit = 20) {
  const payload = await getContentPayload()
  const result = await payload.find({
    collection: 'social-links',
    depth: 0,
    limit,
    overrideAccess: false,
    sort: 'order',
    where: {
      enabled: {
        equals: true,
      },
    },
  })

  return {
    ...result,
    docs: result.docs.flatMap((item) => {
      const safe = sanitizeSocialLink(item)
      return safe ? [safe] : []
    }),
  }
}
