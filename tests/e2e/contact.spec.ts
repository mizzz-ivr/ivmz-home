import { expect, test } from '@playwright/test'

test.describe('Contact form', () => {
  test('submits safely in Preview without real delivery', async ({ page }) => {
    await page.goto('/contact')

    await page.getByLabel('お名前').fill('Preview Visitor')
    await page.getByLabel('メールアドレス').fill('visitor@example.com')
    await page.getByLabel('カテゴリ').selectOption('development')
    await page.getByLabel('件名').fill('Preview contact test')
    await page.getByLabel('問い合わせ内容').fill('Deploy Previewでの問い合わせフォーム動作確認です。')

    await page.getByRole('button', { name: 'Send message ↗' }).click()

    await expect(page.getByRole('status')).toContainText(
      'Deploy Previewでは実メールは送信されません。',
    )
    await expect(page.getByLabel('問い合わせ内容')).toHaveValue('')
  })

  test('keeps user input visible when delivery fails', async ({ page }) => {
    await page.route('**/api/contact', async (route) => {
      await route.fulfill({
        body: JSON.stringify({
          code: 'delivery_unavailable',
          ok: false,
        }),
        contentType: 'application/json',
        status: 503,
      })
    })

    await page.goto('/contact')

    await page.getByLabel('お名前').fill('Visitor')
    await page.getByLabel('メールアドレス').fill('visitor@example.com')
    await page.getByLabel('カテゴリ').selectOption('personal')
    await page.getByLabel('件名').fill('Keep this message')
    await page.getByLabel('問い合わせ内容').fill('失敗時にも残してほしい問い合わせ内容です。')

    await page.getByRole('button', { name: 'Send message ↗' }).click()

    await expect(page.getByRole('alert')).toContainText('入力内容は残っています。')
    await expect(page.getByLabel('件名')).toHaveValue('Keep this message')
    await expect(page.getByLabel('問い合わせ内容')).toHaveValue(
      '失敗時にも残してほしい問い合わせ内容です。',
    )
  })

  test('keeps direct mail fallback available', async ({ page }) => {
    await page.goto('/contact')

    await expect(page.getByRole('link', { name: 'ivmz@ivrm.jp' }).first()).toHaveAttribute(
      'href',
      'mailto:ivmz@ivrm.jp',
    )
    await expect(page.getByRole('link', { name: 'security@ivrm.jp' }).first()).toHaveAttribute(
      'href',
      'mailto:security@ivrm.jp',
    )
  })
})
