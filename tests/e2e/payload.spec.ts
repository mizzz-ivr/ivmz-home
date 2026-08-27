import { expect, test, type APIResponse } from '@playwright/test'

const publicCollections = ['works', 'posts', 'news', 'schedule', 'social-links'] as const
const draftEnabledCollections = ['works', 'posts', 'news'] as const

async function responseDiagnostic(response: APIResponse) {
  const contentType = response.headers()['content-type'] ?? 'unknown'
  const body = await response.text()

  return `status=${response.status()} content-type=${contentType} body=${body.slice(0, 2_000)}`
}

test('保護されたPayload Adminの入口を表示できる', async ({ page }) => {
  const response = await page.goto('/admin')

  expect(response?.ok()).toBe(true)
  await expect(page).toHaveURL(/\/admin\/(login|create-first-user)(?:\?.*)?$/)
})

test('Users collectionを匿名ユーザーへ公開しない', async ({ request }) => {
  const response = await request.get('/api/users?limit=1')

  expect([401, 403], await responseDiagnostic(response)).toContain(response.status())
})

test('公開Content collectionは匿名readできる', async ({ request }) => {
  for (const collection of publicCollections) {
    const response = await request.get(`/api/${collection}?limit=1`)
    const diagnostic = await responseDiagnostic(response)

    expect(response.status(), `${collection}: ${diagnostic}`).toBe(200)
    const payload = JSON.parse(await response.body().then((body) => body.toString('utf8')))
    expect(Array.isArray(payload.docs), collection).toBe(true)
  }
})

test('draft-enabled Contentは匿名queryでもdraftを返さない', async ({ request }) => {
  for (const collection of draftEnabledCollections) {
    const response = await request.get(
      `/api/${collection}?where[_status][equals]=draft&limit=1&depth=0`,
    )
    const diagnostic = await responseDiagnostic(response)

    expect(response.status(), `${collection}: ${diagnostic}`).toBe(200)
    const payload = JSON.parse(await response.body().then((body) => body.toString('utf8')))
    expect(payload.docs, collection).toEqual([])
  }
})

test('匿名ユーザーはContent collectionを作成できない', async ({ request }) => {
  for (const collection of publicCollections) {
    const response = await request.post(`/api/${collection}`, {
      data: {
        title: 'anonymous write must be denied',
      },
    })

    expect([401, 403], `${collection}: ${await responseDiagnostic(response)}`).toContain(
      response.status(),
    )
  }
})

test('匿名ユーザーはContent collectionを更新・削除できない', async ({ request }) => {
  const updateResponse = await request.patch('/api/works/999999999', {
    data: {
      title: 'anonymous update must be denied',
    },
  })
  const deleteResponse = await request.delete('/api/works/999999999')

  expect([401, 403], `update: ${await responseDiagnostic(updateResponse)}`).toContain(
    updateResponse.status(),
  )
  expect([401, 403], `delete: ${await responseDiagnostic(deleteResponse)}`).toContain(
    deleteResponse.status(),
  )
})
