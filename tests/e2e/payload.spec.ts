import { expect, test } from '@playwright/test'

test('serves the protected Payload admin entry point', async ({ page }) => {
  const response = await page.goto('/admin')

  expect(response?.ok()).toBe(true)
  await expect(page).toHaveURL(/\/admin\/(login|create-first-user)(?:\?.*)?$/)
})

test('does not expose the users collection anonymously', async ({ request }) => {
  const response = await request.get('/api/users?limit=1')

  expect([401, 403]).toContain(response.status())
})
