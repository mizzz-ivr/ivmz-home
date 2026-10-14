import { expect, test } from '@playwright/test'

import { gotoExpected } from './navigation'
import { getWithTransientRetry } from './request'

test.describe.configure({ retries: 0 })

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
        sameAs: expect.arrayContaining([
          'https://github.com/mizzz-ivr',
          'https://x.com/ivuruGG',
          'https://www.youtube.com/@ivuru-mz',
        ]),
      }),
    ]),
  )

  const character = page.getByAltText('mizzzのGitHubアイコンに使用しているオリジナルキャラクター')
  await expect(character).toBeVisible()
  await expect
    .poll(async () => character.evaluate((image: HTMLImageElement) => image.naturalWidth))
    .toBeGreaterThan(0)

  const robots = await getWithTransientRetry(request, '/robots.txt')
  expect(robots.status(), '/robots.txt').toBe(200)
  const robotsText = await robots.text()
  expect(robotsText).toContain('User-Agent: *')
  expect(robotsText).toContain('Disallow: /admin/')
  expect(robotsText).toContain('Disallow: /api/')
  expect(robotsText).toContain('https://ivmz.ivrm.jp/sitemap.xml')

  const sitemap = await getWithTransientRetry(request, '/sitemap.xml')
  expect(sitemap.status(), '/sitemap.xml').toBe(200)
  expect(await sitemap.text()).toContain('<loc>https://ivmz.ivrm.jp/</loc>')
})

test('keeps layered content readable with reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await gotoExpected(page, '/')

  const workbench = page.locator('.about-workbench')
  const workbenchWindows = workbench.locator('.workbench-window')
  const latestCards = page.locator('.latest-column')

  await expect(workbench).toBeVisible()
  await expect(workbench.getByText('ship → learn → refine')).toBeVisible()

  const workbenchCount = await workbenchWindows.count()
  expect(workbenchCount).toBeGreaterThan(0)
  for (let index = 0; index < workbenchCount; index += 1) {
    await expect(workbenchWindows.nth(index)).toHaveCSS('transform', 'none')
  }

  // Published CMS content may legitimately be empty (the Latest section is then not rendered).
  // When columns exist, reduced motion must still remove their transforms.
  const latestCount = await latestCards.count()
  for (let index = 0; index < latestCount; index += 1) {
    await expect(latestCards.nth(index)).toHaveCSS('transform', 'none')
  }
})
