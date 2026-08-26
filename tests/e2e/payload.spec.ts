import { expect, test } from '@playwright/test'

test('保護されたPayload Adminの入口を表示できる', async ({ page }) => {
  const response = await page.goto('/admin')

  expect(response?.ok()).toBe(true)
  await expect(page).toHaveURL(/\/admin\/(login|create-first-user)(?:\?.*)?$/)
})

test('Users collectionを匿名ユーザーへ公開しない', async ({ request }) => {
  const response = await request.get('/api/users?limit=1')

  expect([401, 403]).toContain(response.status())
})
