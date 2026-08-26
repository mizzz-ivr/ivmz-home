import configPromise from '@payload-config'
import { getPayload } from 'payload'

async function getContentPayload() {
  return getPayload({ config: configPromise })
}

export async function getPublishedWorks(limit = 3) {
  const payload = await getContentPayload()

  return payload.find({
    collection: 'works',
    depth: 0,
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
