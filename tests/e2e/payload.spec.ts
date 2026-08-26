import { expect, test } from '@playwright/test'

const publicCollections = ['works', 'posts', 'news', 'schedule', 'social-links'] as const

test('保護されたPayload Adminの入口を表示できる', async ({ page }) => {
  const response = await page.goto('/admin')

  expect(response?.ok()).toBe(true)
  await expect(page).toHaveURL(/\/admin\/(login|create-first-user)(?:\?.*)?$/)
})

test('Users collectionを匿名ユーザーへ公開しない', async ({ request }) => {
  const response = await request.get('/api/users?limit=1')

  expect([401, 403]).toContain(response.status())
})

test('公開Content collectionは匿名readできる', async ({ request }) => {
  for (const collection of publicCollections) {
    const response = await request.get(`/api/${collection}?limit=1`)

    expect(response.status(), collection).toBe(200)
    const payload = await response.json()
    expect(Array.isArray(payload.docs), collection).toBe(true)
  }
})

test('匿名ユーザーはContent collectionを作成できない', async ({ request }) => {
  for (const collection of publicCollections) {
    const response = await request.post(`/api/${collection}`, {
      data: {
        title: 'anonymous write must be denied',
      },
    })

    expect([401, 403], collection).toContain(response.status())
  }
})

test('匿名ユーザーはContent collectionを更新・削除できない', async ({ request }) => {
  const updateResponse = await request.patch('/api/works/999999999', {
    data: {
      title: 'anonymous update must be denied',
    },
  })
  const deleteResponse = await request.delete('/api/works/999999999')

  expect([401, 403]).toContain(updateResponse.status())
  expect([401, 403]).toContain(deleteResponse.status())
})
