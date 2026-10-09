import { expect, test, type Page } from '@playwright/test'

const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

const policy = {
  enabled: true,
  maxFileBytes: 5 * 1024 * 1024,
  maxFiles: 3,
  maxTotalBytes: 15 * 1024 * 1024,
  types: [
    { extensions: ['png'], id: 'png', label: 'PNG image', mime: 'image/png' },
    { extensions: ['pdf'], id: 'pdf', label: 'PDF document', mime: 'application/pdf' },
  ],
}

type Finalize = { payload: unknown; status: number }

/** The whole upload pipeline is mocked, so this runs against any deployment without touching AWS. */
async function mockAttachmentApi(page: Page, finalize: Finalize[]) {
  const calls = { init: 0, finalize: 0 }
  let submitted: Record<string, unknown> | undefined

  await page.route('**/api/contact/attachments/policy', (route) => route.fulfill({ json: policy }))
  await page.route('**/api/contact/attachments', (route) => {
    if (route.request().method() !== 'POST') return route.continue()
    calls.init += 1
    return route.fulfill({
      json: {
        expiresIn: 900,
        ok: true,
        upload: { fields: { key: 'quarantine/x' }, url: 'https://bucket.example.test/' },
        uploadToken: 'upload-token',
      },
      status: 201,
    })
  })
  await page.route('https://bucket.example.test/**', (route) =>
    route.fulfill({ body: '', status: 204 }),
  )
  await page.route('**/api/contact/attachments/finalize', (route) => {
    const step = finalize[Math.min(calls.finalize, finalize.length - 1)]
    calls.finalize += 1
    return route.fulfill({ json: step.payload as object, status: step.status })
  })
  await page.route('**/api/contact', (route) => {
    submitted = route.request().postDataJSON() as Record<string, unknown>
    return route.fulfill({ json: { mode: 'sent', ok: true, requestId: 'r' }, status: 201 })
  })

  return { calls, submitted: () => submitted }
}

async function fillRequired(page: Page) {
  await page.getByLabel('お名前').fill('Visitor')
  await page.getByLabel('メールアドレス').fill('visitor@example.com')
  await page.getByLabel('カテゴリ').selectOption('personal')
  await page.getByLabel('件名').fill('With attachment')
  await page.getByLabel('問い合わせ内容').fill('添付ファイル付きの問い合わせです。')
}

test.describe('Contact attachments', () => {
  test('attaches a file only after the scan reports it clean', async ({ page }) => {
    const api = await mockAttachmentApi(page, [
      { payload: { ok: true, status: 'scanning' }, status: 202 },
      {
        payload: {
          attachment: { mime: 'image/png', name: 'photo.png', size: 68 },
          attachmentToken: 'attachment-token',
          ok: true,
          status: 'clean',
        },
        status: 200,
      },
    ])
    await page.goto('/contact')
    await fillRequired(page)
    await page.setInputFiles('#contact-attachments-input', {
      buffer: png,
      mimeType: 'image/png',
      name: 'photo.png',
    })

    await expect(page.getByText('ウイルススキャン中…').first()).toBeVisible()
    await expect(page.getByRole('button', { name: /Scanning files/ })).toBeDisabled()
    await expect(page.getByText('安全を確認済み')).toBeVisible({ timeout: 20_000 })

    await page.getByRole('button', { name: '内容を確認する ↗' }).click()
    await expect(page.getByRole('heading', { name: '送信内容の確認' })).toBeVisible()
    await page.getByRole('button', { name: '送信する ↗' }).click()
    await expect(page.getByRole('status').filter({ hasText: '送信しました' })).toBeVisible()
    expect(api.submitted()?.attachments).toEqual(['attachment-token'])
  })

  test('shows the reason and never submits an infected file', async ({ page }) => {
    const api = await mockAttachmentApi(page, [
      { payload: { ok: false, reason: 'malware_detected', status: 'rejected' }, status: 422 },
    ])
    await page.goto('/contact')
    await fillRequired(page)
    await page.setInputFiles('#contact-attachments-input', {
      buffer: Buffer.from('X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*'),
      mimeType: 'application/pdf',
      name: 'invoice.pdf',
    })

    await expect(
      page.locator('.contact-attachment-rejected', {
        hasText: 'ウイルスの疑いがあるため添付できません。',
      }),
    ).toBeVisible({
      timeout: 20_000,
    })

    await page.getByRole('button', { name: '内容を確認する ↗' }).click()
    await expect(page.getByRole('heading', { name: '送信内容の確認' })).toBeVisible()
    await page.getByRole('button', { name: '送信する ↗' }).click()
    await expect(page.getByRole('status').filter({ hasText: '送信しました' })).toBeVisible()
    expect(api.submitted()?.attachments).toEqual([])
  })

  test('refuses disallowed types in the browser without contacting the server', async ({
    page,
  }) => {
    const api = await mockAttachmentApi(page, [
      { payload: { ok: true, status: 'scanning' }, status: 202 },
    ])
    await page.goto('/contact')
    await page.setInputFiles('#contact-attachments-input', {
      buffer: Buffer.from('MZ'),
      mimeType: 'application/x-msdownload',
      name: 'setup.exe',
    })

    await expect(page.getByText('この形式のファイルは添付できません。')).toBeVisible()
    expect(api.calls.init).toBe(0)
  })

  test('lets the visitor remove a file', async ({ page }) => {
    await mockAttachmentApi(page, [{ payload: { ok: true, status: 'scanning' }, status: 202 }])
    await page.goto('/contact')
    await page.setInputFiles('#contact-attachments-input', {
      buffer: png,
      mimeType: 'image/png',
      name: 'photo.png',
    })

    await page.getByRole('button', { name: 'photo.png を削除' }).click()
    await expect(page.getByText('photo.png')).toHaveCount(0)
  })

  test('hides the picker entirely when attachments are not enabled', async ({ page }) => {
    await page.route('**/api/contact/attachments/policy', (route) =>
      route.fulfill({ json: { ...policy, enabled: false } }),
    )
    await page.goto('/contact')
    await expect(page.getByLabel('件名')).toBeVisible()
    await expect(page.locator('.contact-attachments')).toHaveCount(0)
  })
})
