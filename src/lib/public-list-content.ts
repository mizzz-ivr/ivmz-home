import {
  getEnabledSocialLinks,
  getLatestNews,
  getLatestPosts,
  getPublishedWorks,
  getUpcomingSchedule,
} from '@/lib/payload-content'

export type PublicListState<T> =
  | { state: 'ready'; items: T[] }
  | { state: 'error'; items: [] }

async function loadPublicList<T>(
  label: string,
  loader: () => Promise<{ docs: T[] }>,
): Promise<PublicListState<T>> {
  try {
    const result = await loader()
    return { state: 'ready', items: result.docs }
  } catch (error) {
    console.error(`[public-list-content] ${label} query failed.`, error)
    return { state: 'error', items: [] }
  }
}

export function getWorksListContent(limit = 50) {
  return loadPublicList('works', () => getPublishedWorks(limit))
}

export function getPostsListContent(limit = 50) {
  return loadPublicList('posts', () => getLatestPosts(limit))
}

export function getNewsListContent(limit = 50) {
  return loadPublicList('news', () => getLatestNews(limit))
}

export function getScheduleListContent(limit = 50) {
  return loadPublicList('schedule', () => getUpcomingSchedule(limit))
}

export function getSocialLinksListContent(limit = 100) {
  return loadPublicList('social-links', () => getEnabledSocialLinks(limit))
}
