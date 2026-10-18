import { expect, test } from '@playwright/test'

import { gotoExpected } from './navigation'

test('keeps anonymous submissions unavailable until all security settings are enabled', async ({
  page,
}) => {
  await gotoExpected(page, '/message')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Leave a signal.')
  await expect(page.getByText('ひとこと機能は準備中です。')).toBeVisible()
  await expect(page.getByRole('link', { name: /Contactへ/ })).toHaveAttribute('href', '/contact')
  await expect(page.getByRole('textbox', { name: /メッセージ（匿名）/ })).toHaveCount(0)
})

test('keeps the unpublished message page readable at mobile widths', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Viewport matrix is checked on Chromium')
  await gotoExpected(page, '/message')
  for (const width of [320, 375, 390]) {
    await page.setViewportSize({ width, height: 720 })
    const size = await page.evaluate(() => ({
      page: document.documentElement.scrollWidth,
      viewport: document.documentElement.clientWidth,
    }))
    expect(size.page, `/message overflow at ${width}px`).toBeLessThanOrEqual(size.viewport + 1)
  }
})
