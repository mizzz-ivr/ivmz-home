import { expect, test, type APIResponse } from '@playwright/test'

import { gotoExpected } from './navigation'
import { getWithTransientRetry } from './request'

test.describe.configure({ retries: 0 })

const publicCollections = ['works', 'posts', 'news', 'schedule', 'social-links'] as const
const draftEnabledCollections = ['works', 'posts', 'news'] as const
const sensitiveErrorMarkers = [
  'payload_secret',
  'database_url',
  'postgresql://',
  'supabase.co',
  'node_modules',
  '"stack"',
] as const

function responseDiagnostic(response: APIResponse) {
  const headers = response.headers()
  const contentType = headers['content-type'] ?? 'unknown'
  const requestId = headers['x-nf-request-id'] ?? 'unknown'

  return `status=${response.status()} content-type=${contentType} request-id=${requestId}`
}

function expectSecurityHeaders(response: APIResponse, path: string) {
  const headers = response.headers()

  expect(headers['strict-transport-security'], path).toContain('max-age=31536000')
  expect(headers['x-content-type-options'], path).toBe('nosniff')
  expect(headers['referrer-policy'], path).toBe('strict-origin-when-cross-origin')
  expect(headers['permissions-policy'], path).toContain('camera=()')
  expect(headers['x-frame-options'], path).toBe('SAMEORIGIN')
  expect(headers['content-security-policy-report-only'], path).toContain("frame-ancestors 'self'")
  expect(headers['x-powered-by'], path).toBeUndefined()
}

test('保護されたPayload Adminの入口を表示できる', async ({ page }) => {
  await gotoExpected(page, '/admin')

  await expect(page).toHaveURL(/\/admin\/(login|create-first-user)(?:\?.*)?$/)
})

test('Public pageとPayload Adminへsecurity headersを付与する', async ({ request }) => {
  for (const path of ['/', '/admin'] as const) {
    const response = await getWithTransientRetry(request, path)

    expect(response.status(), `${path}: ${responseDiagnostic(response)}`).toBeLessThan(500)
    expectSecurityHeaders(response, path)
  }
})

test('Users collectionを匿名ユーザーへ公開しない', async ({ request }) => {
  const response = await getWithTransientRetry(request, '/api/users?limit=1')

  expect([401, 403], responseDiagnostic(response)).toContain(response.status())
})

test('匿名authorization errorへsecret/internal情報を含めない', async ({ request }) => {
  const response = await getWithTransientRetry(request, '/api/users?limit=1')
  const body = (await response.text()).toLowerCase()

  expect([401, 403], `status=${response.status()}`).toContain(response.status())
  for (const marker of sensitiveErrorMarkers) {
    expect(body, marker).not.toContain(marker)
  }
})

test('公開Content collectionは匿名readできる', async ({ request }) => {
  for (const collection of publicCollections) {
    const response = await getWithTransientRetry(request, `/api/${collection}?limit=1`)
    const diagnostic = responseDiagnostic(response)

    expect(response.status(), `${collection}: ${diagnostic}`).toBe(200)
    const payload = JSON.parse(await response.body().then((body) => body.toString('utf8')))
    expect(Array.isArray(payload.docs), collection).toBe(true)
  }
})

test('draft-enabled Contentは匿名queryでもdraftを返さない', async ({ request }) => {
  for (const collection of draftEnabledCollections) {
    const response = await getWithTransientRetry(
      request,
      `/api/${collection}?where[_status][equals]=draft&limit=1&depth=0`,
    )
    const diagnostic = responseDiagnostic(response)

    expect(response.status(), `${collection}: ${diagnostic}`).toBe(200)
    const payload = JSON.parse(await response.body().then((body) => body.toString('utf8')))
    expect(payload.docs, collection).toEqual([])
  }
})

test('version endpointを匿名ユーザーへ公開しない', async ({ request }) => {
  for (const collection of draftEnabledCollections) {
    const response = await getWithTransientRetry(request, `/api/${collection}/versions?limit=1`)

    expect([401, 403], `${collection}: ${responseDiagnostic(response)}`).toContain(
      response.status(),
    )
  }
})

test('private Scheduleとdisabled Social Linkは匿名queryへ漏れない', async ({ request }) => {
  const scheduleResponse = await getWithTransientRetry(
    request,
    '/api/schedule?where[visibility][equals]=private&limit=1&depth=0',
  )
  expect(scheduleResponse.status(), responseDiagnostic(scheduleResponse)).toBe(200)
  const schedulePayload = JSON.parse(
    await scheduleResponse.body().then((body) => body.toString('utf8')),
  )
  expect(schedulePayload.docs).toEqual([])

  const socialResponse = await getWithTransientRetry(
    request,
    '/api/social-links?where[enabled][equals]=false&limit=1&depth=0',
  )
  expect(socialResponse.status(), responseDiagnostic(socialResponse)).toBe(200)
  const socialPayload = JSON.parse(
    await socialResponse.body().then((body) => body.toString('utf8')),
  )
  expect(socialPayload.docs).toEqual([])
})

test('arbitrary OriginへPayload CORS許可を返さない', async ({ request }) => {
  const arbitraryOrigin = 'https://attacker.invalid'
  const arbitraryResponse = await getWithTransientRetry(request, '/api/works?limit=1', {
    headers: {
      Origin: arbitraryOrigin,
    },
  })

  expect(arbitraryResponse.status(), responseDiagnostic(arbitraryResponse)).toBe(200)
  expect(arbitraryResponse.headers()['access-control-allow-origin']).not.toBe(arbitraryOrigin)

  if (process.env.E2E_BASE_URL) {
    const sameOrigin = new URL(process.env.E2E_BASE_URL).origin
    const sameOriginResponse = await getWithTransientRetry(request, '/api/works?limit=1', {
      headers: {
        Origin: sameOrigin,
      },
    })

    // Deploy Previewではpublic appとPayload APIがsame-originのため、
    // ブラウザはAccess-Control-Allow-Originを必要としない。APIの正常応答だけを確認する。
    expect(sameOriginResponse.status(), responseDiagnostic(sameOriginResponse)).toBe(200)
  }
})

test('匿名ユーザーはContent collectionを作成できない', async ({ request }) => {
  for (const collection of publicCollections) {
    const response = await request.post(`/api/${collection}`, {
      data: {
        title: 'anonymous write must be denied',
      },
    })

    expect([401, 403], `${collection}: ${responseDiagnostic(response)}`).toContain(
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

  expect([401, 403], `update: ${responseDiagnostic(updateResponse)}`).toContain(
    updateResponse.status(),
  )
  expect([401, 403], `delete: ${responseDiagnostic(deleteResponse)}`).toContain(
    deleteResponse.status(),
  )
})
