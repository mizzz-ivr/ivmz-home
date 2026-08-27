import { expect, test } from '@playwright/test'

import { gotoExpected } from './navigation'

test('serves primary content, metadata, structured data, robots and sitemap', async ({
  page,
  request,
}) => {
  await gotoExpected(page, '/')

  await expect(page).toHaveTitle(/いゔる。/)
  await expect(page.getByRole('heading', { level: 1 })).toContainText('いゔる。')
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://ivmz.ivrm.jp',
  )

  const structuredData = await page.locator('script[type="application/ld+json"]').allTextContents()
  const schemas = structuredData.map((value) => JSON.parse(value)) as Array<{
    '@graph'?: Array<{ '@type'?: string; url?: string; sameAs?: string[] }>
  }>
  const siteGraph = schemas.flatMap((schema) => schema['@graph'] ?? [])
  expect(siteGraph).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ '@type': 'WebSite', url: 'https://ivmz.ivrm.jp' }),
      expect.objectContaining({
        '@type': 'Person',
        url: 'https://ivmz.ivrm.jp',
        sameAs: ['https://github.com/mizzz-ivr'],
      }),
    ]),
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
