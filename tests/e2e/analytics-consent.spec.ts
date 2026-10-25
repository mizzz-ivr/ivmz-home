import { expect, test } from '@playwright/test'

import { gotoExpected } from './navigation'

test('analytics remains off until the visitor explicitly opts in', async ({ page }) => {
  await gotoExpected(page, '/')
  const tag = page.locator('#ivmz-ga4-script')
  await expect(tag).toHaveCount(0)

  const consent = page.getByRole('dialog', { name: 'アクセス解析への同意' })
  if ((await consent.count()) === 0) {
    // The optional GA4 measurement ID is intentionally unset in CI and most Deploy Previews.
    await expect(page.getByRole('button', { name: 'アクセス解析の設定' })).toHaveCount(0)
    return
  }

  await consent.getByRole('button', { name: '同意しない' }).click()
  await expect(tag).toHaveCount(0)
  await expect(consent).toBeHidden()
  await expect(page.getByRole('button', { name: 'アクセス解析の設定' })).toBeVisible()

  await page.getByRole('button', { name: 'アクセス解析の設定' }).click()
  await consent.getByRole('button', { name: '同意する' }).click()
  await expect(tag).toHaveCount(1)
  await expect(page.locator('script[src*="googletagmanager.com/gtag/js"]')).toHaveCount(1)
})
