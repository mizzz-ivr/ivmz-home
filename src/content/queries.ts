import config from '@payload-config'
import { cache } from 'react'
import { getPayload } from 'payload'

import type {
  News as NewsDocument,
  Post,
  Schedule as ScheduleDocument,
  SocialLink,
  Work,
} from '@/payload-types'

const getPayloadClient = cache(() => getPayload({ config }))

export type HomeContentSnapshot = {
  works: Work[]
  posts: Post[]
  news: NewsDocument[]
  schedule: ScheduleDocument[]
  socialLinks: SocialLink[]
}

export async function getPublishedWorks(limit = 3): Promise<Work[]> {
  const payload = await getPayloadClient()
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

  return result.docs
}

export async function getLatestPosts(limit = 3): Promise<Post[]> {
  const payload = await getPayloadClient()
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

  return result.docs
}

export async function getLatestNews(limit = 3): Promise<NewsDocument[]> {
  const payload = await getPayloadClient()
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

  return result.docs
}

export async function getUpcomingSchedule(limit = 3): Promise<ScheduleDocument[]> {
  const payload = await getPayloadClient()
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
            greater_than_equal: new Date().toISOString(),
          },
        },
      ],
    },
  })

  return result.docs
}

export async function getEnabledSocialLinks(limit = 20): Promise<SocialLink[]> {
  const payload = await getPayloadClient()
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

  return result.docs
}

export async function getHomeContentSnapshot(): Promise<HomeContentSnapshot> {
  const [works, posts, news, schedule, socialLinks] = await Promise.all([
    getPublishedWorks(),
    getLatestPosts(),
    getLatestNews(),
    getUpcomingSchedule(),
    getEnabledSocialLinks(),
  ])

  return {
    works,
    posts,
    news,
    schedule,
    socialLinks,
  }
}
