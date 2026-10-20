import { expect, test } from '@playwright/test'

import { gotoExpected } from './navigation'

test('chat note explains external AI use without showing the provider name', async ({ page }) => {
  await page.route('**/api/chat', (route) =>
    route.fulfill({ json: { enabled: true }, status: 200 }),
  )
  await gotoExpected(page, '/')

  await page.getByRole('button', { name: '質問する' }).click()
  await expect(page.locator('.chat-note')).toContainText('外部AIへ送信して回答を作ります')
  await expect(page.locator('.chat-note')).toContainText('送信内容は当サイトでは保存しません')
  await expect(page.locator('.chat-note')).not.toContainText('Cloudflare')
})

test('chat note correctly describes local-only behavior when AI is unavailable', async ({
  page,
}) => {
  await page.route('**/api/chat', (route) =>
    route.fulfill({ json: { enabled: false }, status: 200 }),
  )
  await gotoExpected(page, '/')

  await page.getByRole('button', { name: '質問する' }).click()
  await expect(page.locator('.chat-note')).toContainText('この端末の中だけで処理され')
  await expect(page.locator('.chat-note')).toContainText('送信も保存もされません')
  await expect(page.locator('.chat-note')).not.toContainText('Cloudflare')
})
