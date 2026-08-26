import { expect, test } from '@playwright/test'

const routes = [
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

test('serves every static/list route directly and after reload', async ({ page }) => {
  for (const route of routes) {
    const response = await page.goto(route)
    expect(response?.ok(), route).toBe(true)
    await expect(page.getByRole('heading', { level: 1 }), route).toBeVisible()

    const reload = await page.reload()
    expect(reload?.ok(), `${route} reload`).toBe(true)
    await expect(page.getByRole('heading', { level: 1 }), route).toBeVisible()
  }
})

test('marks the current route in desktop and mobile navigation', async ({ page }) => {
  await page.goto('/works')

  await expect(page.getByRole('navigation', { name: 'Desktop navigation' }).getByRole('link', { name: 'WORKS' })).toHaveAttribute('aria-current', 'page')
  await expect(page.getByRole('navigation', { name: 'Mobile navigation' }).getByRole('link', { name: /WORKS/ })).toHaveAttribute('aria-current', 'page')
})

test('keeps route pages overflow-free at representative widths', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Responsive route matrix runs in Chromium')

  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    for (const route of routes) {
      await page.goto(route)
      const dimensions = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }))
      expect(dimensions.scrollWidth, `${route} overflow at ${width}px`).toBeLessThanOrEqual(dimensions.clientWidth + 1)
    }
  }
})

test('sitemap contains the multi-page route foundation', async ({ request }) => {
  const response = await request.get('/sitemap.xml')
  expect(response.ok()).toBe(true)
  const xml = await response.text()

  for (const route of routes) {
    expect(xml).toContain(`<loc>https://ivmz.ivrm.jp${route}</loc>`)
  }
})
