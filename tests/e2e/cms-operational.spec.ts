import { expect, test, type APIRequestContext } from '@playwright/test'

import { gotoExpected } from './navigation'

type PublicSchedule = {
  title: string
  startAt: string
  endAt?: string | null
  timezone: string
}

type PublicSocialLink = {
  platform: string
  url: string
  enabled: boolean
  order: number
}

async function publicDocs<T>(request: APIRequestContext, path: string) {
  const response = await request.get(path)
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

test('Schedule page respects public visibility and renders timezone plus optional end time', async ({
  page,
  request,
}) => {
  const items = await publicDocs<PublicSchedule>(
    request,
    '/api/schedule?limit=1&depth=0&sort=startAt',
  )

  await gotoExpected(page, '/schedule')
  const item = items[0]

  if (!item) {
    await expect(page.getByText('Nothing public is scheduled.', { exact: true })).toBeVisible()
    return
  }

  const row = page.locator('article').filter({ hasText: item.title })
  await expect(row).toBeVisible()
  await expect(row).toContainText(item.timezone)
  await expect(row).toContainText(formatScheduleTime(item.startAt, item.timezone))

  if (item.endAt) {
    await expect(row).toContainText(formatScheduleTime(item.endAt, item.timezone))
  }
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
