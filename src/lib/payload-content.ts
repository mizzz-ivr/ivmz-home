import configPromise from '@payload-config'
import { cache } from 'react'
import { getPayload } from 'payload'

import { createPublishedSlugWhere } from '@/lib/payload-detail-query'

const getContentPayload = cache(() => getPayload({ config: configPromise }))

export async function getPublishedWorks(limit = 3) {
  const payload = await getContentPayload()

  return payload.find({
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
}

export async function getLatestPosts(limit = 3) {
  const payload = await getContentPayload()

  return payload.find({
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
}

export async function getLatestNews(limit = 3) {
  const payload = await getContentPayload()

  return payload.find({
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

  return result.docs[0] ?? null
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

  return result.docs[0] ?? null
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

  return result.docs[0] ?? null
})

export async function getUpcomingSchedule(limit = 3, now = new Date()) {
  const payload = await getContentPayload()

  return payload.find({
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
}

export async function getEnabledSocialLinks(limit = 20) {
  const payload = await getContentPayload()

  return payload.find({
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
}
