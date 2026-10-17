import { expect, test } from '@playwright/test'

import { gotoExpected } from './navigation'

test('the decorative signal trace preserves Hero readability and pointer access', async ({
  page,
}) => {
  await gotoExpected(page, '/')

  const decoration = page.locator('svg.signal-play-art')
  await expect(decoration).toBeAttached()
  await expect(decoration).toHaveAttribute('aria-hidden', 'true')
  await expect(decoration).toHaveCSS('pointer-events', 'none')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('いゔる。')
  await expect(page.getByRole('link', { name: 'Selected Works' })).toBeVisible()
  await expect(page.getByRole('link', { name: /Contact/ }).first()).toBeVisible()
})

test('the signal trace remains static when the visitor prefers reduced motion', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await gotoExpected(page, '/')

  await expect(page.locator('.signal-play-trace')).toHaveCSS('animation-name', 'none')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
})
