import { expect, test } from '@playwright/test'

import { gotoExpected } from './navigation'

test('serves primary content, metadata, robots and sitemap', async ({ page, request }) => {
  await gotoExpected(page, '/')

  await expect(page).toHaveTitle(/いゔる。/)
  await expect(page.getByRole('heading', { level: 1 })).toContainText('いゔる。')
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://ivmz.ivrm.jp',
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
  expect(robotsText).toContain('https://ivmz.ivrm.jp/sitemap.xml')

  const sitemap = await request.get('/sitemap.xml')
  expect(sitemap.ok()).toBe(true)
  expect(await sitemap.text()).toContain('<loc>https://ivmz.ivrm.jp/</loc>')
})

test('keeps layered content readable with reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await gotoExpected(page, '/')

  const workbench = page.locator('.about-workbench')
  const workbenchWindows = workbench.locator('.workbench-window')
  const writingCards = page.locator('.editorial-stack article')

  await expect(workbench).toBeVisible()
  await expect(workbench.getByText('ship → learn → refine')).toBeVisible()
  await expect(writingCards.first()).toBeVisible()

  for (const locator of [workbenchWindows, writingCards]) {
    const count = await locator.count()
    expect(count).toBeGreaterThan(0)
    for (let index = 0; index < count; index += 1) {
      await expect(locator.nth(index)).toHaveCSS('transform', 'none')
    }
  }
})
