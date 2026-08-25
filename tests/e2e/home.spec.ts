import { expect, test } from '@playwright/test'

test('renders identity and primary navigation without animation gates', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('いゔる。')
  await expect(page.getByRole('link', { name: 'Selected Works' })).toBeVisible()
  await expect(
    page.getByAltText('mizzzのGitHubアイコンに使用しているオリジナルキャラクター'),
  ).toBeVisible()
})
