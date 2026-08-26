import { expect, test } from '@playwright/test'

test('serves primary content, metadata, robots and sitemap', async ({ page, request }) => {
  const response = await page.goto('/')
  expect(response?.ok()).toBe(true)

  await expect(page).toHaveTitle(/いゔる。/)
  await expect(page.getByRole('heading', { level: 1 })).toContainText('いゔる。')
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://mizzz.ivrm.jp',
  )

  const character = page.getByAltText('mizzzのGitHubアイコンに使用しているオリジナルキャラクター')
  await expect(character).toBeVisible()
  await expect
    .poll(async () => character.evaluate((image: HTMLImageElement) => image.naturalWidth))
    .toBeGreaterThan(0)

  const robots = await request.get('/robots.txt')
  expect(robots.ok()).toBe(true)
  const robotsText = await robots.text()
  expect(robotsText).toContain('User-Agent: *')
  expect(robotsText).toContain('Disallow: /admin/')
  expect(robotsText).toContain('Disallow: /api/')
  expect(robotsText).toContain('https://mizzz.ivrm.jp/sitemap.xml')

  const sitemap = await request.get('/sitemap.xml')
  expect(sitemap.ok()).toBe(true)
  expect(await sitemap.text()).toContain('<loc>https://mizzz.ivrm.jp</loc>')
})

test('keeps layered content non-overlapping with reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')

  const aboutPlanes = page.locator('.about-plane')
  const writingCards = page.locator('.writing-stack article')

  await expect(aboutPlanes.first()).toBeVisible()
  await expect(writingCards.first()).toBeVisible()

  for (const locator of [aboutPlanes, writingCards]) {
    const count = await locator.count()
    for (let index = 0; index < count; index += 1) {
      await expect(locator.nth(index)).toHaveCSS('position', 'static')
    }
  }
})
