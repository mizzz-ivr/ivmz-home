import {
  expect,
  test,
  type APIRequestContext,
  type APIResponse,
} from '@playwright/test'

import { gotoExpected } from './navigation'

async function getStatus200(request: APIRequestContext, path: string): Promise<APIResponse> {
  let lastError: unknown

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await request.get(path)
      if (response.status() === 200) return response
      lastError = new Error(`${path} returned HTTP ${response.status()}`)
    } catch (error) {
      lastError = error
    }

    if (attempt < 3) {
      await new Promise((resolve) => setTimeout(resolve, 500 * attempt))
    }
  }

  if (lastError instanceof Error) throw lastError
  throw new Error(`${path} did not return HTTP 200`)
}

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

  const robots = await getStatus200(request, '/robots.txt')
  const robotsText = await robots.text()
  expect(robotsText).toContain('User-Agent: *')
  expect(robotsText).toContain('Disallow: /admin/')
  expect(robotsText).toContain('Disallow: /api/')
  expect(robotsText).toContain('https://ivmz.ivrm.jp/sitemap.xml')

  const sitemap = await getStatus200(request, '/sitemap.xml')
  expect(await sitemap.text()).toContain('<loc>https://ivmz.ivrm.jp/</loc>')
})

test('keeps layered content readable with reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await gotoExpected(page, '/')

  const workbench = page.locator('.about-workbench')
  const workbenchWindows = workbench.locator('.workbench-window')
  const writingSection = page.locator('#writing')
  const writingCards = page.locator('.editorial-stack article')

  await expect(workbench).toBeVisible()
  await expect(workbench.getByText('ship → learn → refine')).toBeVisible()
  await expect(writingSection).toBeVisible()

  const workbenchCount = await workbenchWindows.count()
  expect(workbenchCount).toBeGreaterThan(0)
  for (let index = 0; index < workbenchCount; index += 1) {
    await expect(workbenchWindows.nth(index)).toHaveCSS('transform', 'none')
  }

  // Published CMS content may legitimately be empty. When cards exist, reduced motion
  // must still remove their transforms; an empty writing section is also a valid state.
  const writingCount = await writingCards.count()
  for (let index = 0; index < writingCount; index += 1) {
    await expect(writingCards.nth(index)).toHaveCSS('transform', 'none')
  }
})
