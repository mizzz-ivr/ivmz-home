import { expect, test } from '@playwright/test'

import { gotoExpected } from './navigation'

test('chat note explains external AI use without showing the provider name', async ({ page }) => {
  await page.route('**/api/chat', (route) =>
    route.fulfill({ json: { enabled: true }, status: 200 }),
  )
  await gotoExpected(page, '/')

  // Netlify Preview injects a debug iframe over the launcher. Reuse the production
  // open-chat event rather than clicking through the third-party overlay.
  const chat = page.getByRole('dialog', { name: 'FAQ Assistant' })
  await expect(async () => {
    await page.evaluate(() => window.dispatchEvent(new Event('ivmz:open-chat')))
    await expect(chat).toBeVisible({ timeout: 1_000 })
  }).toPass()
  await expect(page.locator('.chat-note')).toContainText('外部AIへ送信')
  await expect(page.locator('.chat-note')).toContainText('個人情報は入力しないでください')
  await expect(page.locator('.chat-note')).not.toContainText('Cloudflare')

  await page.getByRole('button', { name: '個人情報の扱いは？' }).click()
  const log = page.getByRole('log', { name: '会話' })
  await expect(log).toContainText('外部AIへ送信されます')
  await expect(log).not.toContainText('Cloudflare Workers AI')
})

test('chat note correctly describes local-only behavior when AI is unavailable', async ({
  page,
}) => {
  await page.route('**/api/chat', (route) =>
    route.fulfill({ json: { enabled: false }, status: 200 }),
  )
  await gotoExpected(page, '/')

  // Netlify Preview injects a debug iframe over the launcher. Reuse the production
  // open-chat event rather than clicking through the third-party overlay.
  const chat = page.getByRole('dialog', { name: 'FAQ Assistant' })
  await expect(async () => {
    await page.evaluate(() => window.dispatchEvent(new Event('ivmz:open-chat')))
    await expect(chat).toBeVisible({ timeout: 1_000 })
  }).toPass()
  await expect(page.locator('.chat-note')).toContainText('この端末の中だけで処理され')
  await expect(page.locator('.chat-note')).toContainText('送信も保存もされません', {
    timeout: 15_000,
  })
  await expect(page.locator('.chat-note')).not.toContainText('Cloudflare')
})
