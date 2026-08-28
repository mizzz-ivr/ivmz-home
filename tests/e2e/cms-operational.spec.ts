import { expect, test, type APIRequestContext } from '@playwright/test'

import { gotoExpected } from './navigation'
import { getWithTransientRetry } from './request'

type PublicSchedule = {
  title: string
  startAt: string
  endAt?: string | null
  timezone: string
  visibility: 'public'
}

type PublicSocialLink = {
  platform: string
  url: string
  enabled: boolean
  order: number
}

async function publicDocs<T>(request: APIRequestContext, path: string) {
  const response = await getWithTransientRetry(request, path)
  expect(response.status(), path).toBe(200)
  const payload = (await response.json()) as { docs: T[] }
  return payload.docs
}

function formatScheduleTime(value: string, timezone: string) {
  return new Intl.DateTimeFormat('ja-JP', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: timezone,
  }).format(new Date(value))
}

test('Schedule API keeps public visibility and the ISR page renders a healthy public state', async ({
  page,
  request,
}) => {
  const requestedAt = new Date()
  const now = encodeURIComponent(requestedAt.toISOString())
  const items = await publicDocs<PublicSchedule>(
    request,
    `/api/schedule?where[startAt][greater_than_equal]=${now}&limit=20&depth=0&sort=startAt`,
  )

  for (const item of items) {
    expect(item.visibility, item.title).toBe('public')
    expect(new Date(item.startAt).getTime(), item.title).toBeGreaterThanOrEqual(
      requestedAt.getTime(),
    )
    expect(() => formatScheduleTime(item.startAt, item.timezone), item.title).not.toThrow()
    if (item.endAt) {
      expect(() => formatScheduleTime(item.endAt, item.timezone), item.title).not.toThrow()
    }
  }

  await gotoExpected(page, '/schedule')

  // The page uses a 5-minute ISR window, so its snapshot can legitimately lag the live
  // API query above. Validate the API security/filter boundary separately, then require
  // the rendered snapshot to be a healthy public state rather than an exact live-data match.
  await expect(
    page.getByText('Schedule is temporarily unavailable.', { exact: true }),
  ).toHaveCount(0)

  const emptyState = page.getByText('Nothing public is scheduled.', { exact: true })
  const rows = page.locator('.content-list > article')
  const emptyVisible = await emptyState.isVisible().catch(() => false)
  const rowCount = await rows.count()

  expect(
    emptyVisible || rowCount > 0,
    'schedule page must render an empty state or public rows',
  ).toBe(true)
})

test('Social Links page treats a successful zero-result query as an intentional empty state', async ({
  page,
  request,
}) => {
  const links = await publicDocs<PublicSocialLink>(
    request,
    '/api/social-links?limit=100&depth=0&sort=order',
  )

  await gotoExpected(page, '/links')

  if (links.length === 0) {
    await expect(page.getByText('No CMS links are published yet.', { exact: true })).toBeVisible()
    await expect(page.locator('.link-directory')).toHaveCount(0)
    return
  }

  const directoryLinks = page.locator('.link-directory > a')
  await expect(directoryLinks).toHaveCount(links.length)

  for (const [index, link] of links.entries()) {
    expect(link.enabled).toBe(true)
    const rendered = directoryLinks.nth(index)
    await expect(rendered).toContainText(link.platform)
    await expect(rendered).toHaveAttribute('href', new URL(link.url).toString())
  }
})
