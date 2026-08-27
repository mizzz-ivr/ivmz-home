import { expect, test } from '@playwright/test'

import { gotoExpected } from './navigation'

const publicRoutes = [
  '/',
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

test('renders one shared footer on every public route', async ({ page }) => {
  for (const route of publicRoutes) {
    await gotoExpected(page, route)
    const footer = page.locator('footer.global-site-footer')

    await expect(footer, route).toHaveCount(1)
    await expect(footer.getByRole('navigation', { name: 'Footer navigation' }), route).toBeVisible()
    await expect(footer.getByRole('link', { name: 'PRIVACY' }), route).toHaveAttribute(
      'href',
      '/legal/privacy',
    )
  }
})

test('uses a new document for internal public route navigation', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Document-navigation probe runs once in Chromium')

  await gotoExpected(page, '/')
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.evaluate(() => {
    ;(window as Window & { __ivmzDocumentProbe?: string }).__ivmzDocumentProbe = 'home-document'
  })

  await page.locator('.hero-actions a[href="/works"]').click()
  await page.waitForURL('**/works')

  const probe = await page.evaluate(
    () => (window as Window & { __ivmzDocumentProbe?: string }).__ivmzDocumentProbe ?? null,
  )
  expect(probe).toBeNull()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Work')
})

test('keeps theme preference across full document navigation', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Theme persistence probe runs once in Chromium')

  await gotoExpected(page, '/')
  await page.evaluate(() => {
    localStorage.setItem('ivmz-theme', 'light')
    document.documentElement.dataset.theme = 'light'
  })

  await page.locator('.hero-actions a[href="/contact"]').click()
  await page.waitForURL('**/contact')

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
})
