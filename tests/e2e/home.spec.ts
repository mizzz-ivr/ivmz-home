import { expect, test } from '@playwright/test'

import { gotoExpected, reloadExpected } from './navigation'

test('renders the complete home experience without animation gates', async ({ page }) => {
  await gotoExpected(page, '/')

  await expect(page.getByRole('heading', { level: 1 })).toContainText('いゔる。')
  await expect(page.getByRole('link', { name: 'Selected Works' })).toBeVisible()
  await expect(
    page.getByAltText('mizzzのGitHubアイコンに使用しているオリジナルキャラクター'),
  ).toBeVisible()

  // Writing / News / Schedule appear under "Latest" only when the CMS has content, so they are
  // not asserted here.
  for (const heading of [
    '公開しながら、つくる。',
    '画面から、運用まで。',
    '作って終わりにしない。',
    'よくある質問。',
    '画面の向こう側まで、つくる。',
    'ご相談は、気軽に。',
  ]) {
    await expect(page.getByRole('heading', { name: new RegExp(heading) })).toBeAttached()
  }
})

test('toggles and persists the visual theme across routes', async ({ page }) => {
  await gotoExpected(page, '/')
  const root = page.locator('html')
  await expect(root).toHaveAttribute('data-theme', /^(dark|light)$/)
  const before = await root.getAttribute('data-theme')
  expect(before === 'dark' || before === 'light').toBe(true)

  await page.getByRole('button', { name: 'テーマを切り替える' }).click()
  const expectedAfter = before === 'dark' ? 'light' : 'dark'
  await expect(root).toHaveAttribute('data-theme', expectedAfter)

  await gotoExpected(page, '/about')
  await expect(root).toHaveAttribute('data-theme', expectedAfter)

  await reloadExpected(page, '/about')
  await expect(root).toHaveAttribute('data-theme', expectedAfter)
})

test('stays overflow-free at every required responsive width', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Responsive width matrix runs in Chromium')

  await gotoExpected(page, '/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

  for (const width of [320, 375, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    const dimensions = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }))
    expect(dimensions.scrollWidth, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(
      dimensions.clientWidth + 1,
    )
  }
})

test('desktop navigation expands for keyboard focus', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Desktop keyboard behavior only')
  await page.setViewportSize({ width: 1280, height: 900 })
  await gotoExpected(page, '/')

  const shell = page.locator('.desktop-nav-shell')
  const homeLink = page.getByRole('navigation', { name: 'Desktop navigation' }).getByRole('link', {
    name: 'HOME',
  })
  await homeLink.focus()
  await expect(homeLink).toBeFocused()
  await expect.poll(async () => (await shell.boundingBox())?.width ?? 0).toBeGreaterThan(500)
})

test('mobile drawer supports keyboard escape and closes after route navigation', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-webkit', 'Mobile drawer only')
  await gotoExpected(page, '/')

  const trigger = page.locator('button[aria-controls="mobile-navigation"]')
  const drawer = page.locator('#mobile-navigation')

  await expect(trigger).toHaveAccessibleName('メニューを開く')
  await expect(trigger).toHaveAttribute('aria-expanded', 'false')

  await trigger.click()
  await expect(trigger).toHaveAccessibleName('メニューを閉じる')
  await expect(trigger).toHaveAttribute('aria-expanded', 'true')
  await expect(drawer).toHaveAttribute('aria-hidden', 'false')

  await page.keyboard.press('Escape')
  await expect(trigger).toHaveAccessibleName('メニューを開く')
  await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  await expect(trigger).toBeFocused()

  await trigger.click()
  await drawer.getByRole('link', { name: /WORKS/ }).click()
  await expect(trigger).toHaveAccessibleName('メニューを開く')
  await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  await expect(page).toHaveURL(/\/works$/)
})

test('reduced motion keeps primary content immediately usable', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await gotoExpected(page, '/')

  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Selected Works' })).toBeVisible()
  await expect(page.locator('.signature-intro')).toHaveCSS('visibility', 'hidden')
})

test('answers FAQ questions in the home chat and falls back to the contact form', async ({
  page,
}) => {
  // Keep the test independent of whether the optional AI answer is configured in the environment.
  await page.route('**/api/chat', (route) => route.fulfill({ json: { reply: null } }))
  await gotoExpected(page, '/')

  const launcher = page.getByRole('button', { name: '質問する' })
  await launcher.click()
  const chat = page.getByRole('dialog', { name: 'FAQ Assistant' })
  await expect(chat).toBeVisible()
  await expect(chat.getByText('FAQアシスタントです')).toBeVisible()

  await chat.getByRole('button', { name: 'ファイルは送れる？' }).click()
  await expect(chat.getByText('ウイルススキャン')).toBeVisible()

  // Free text that matches a FAQ entry is answered locally, without any network call.
  await chat.getByLabel('質問を入力').fill('返信はいつ頃ですか')
  await chat.getByRole('button', { name: '送信' }).click()
  await expect(chat.getByText('お約束できません')).toBeVisible()

  // Anything else falls back to the contact form (the AI answer is off in tests).
  await chat.getByLabel('質問を入力').fill('今日の天気は？')
  await chat.getByRole('button', { name: '送信' }).click()
  await expect(chat.getByText('うまくお答えできませんでした')).toBeVisible()
  await expect(chat.getByRole('link', { name: /お問い合わせフォームへ/ }).last()).toHaveAttribute(
    'href',
    '/contact',
  )

  await page.keyboard.press('Escape')
  await expect(chat).toBeHidden()
  await expect(launcher).toBeFocused()
})

test('opens the chat from the FAQ section', async ({ page }) => {
  await gotoExpected(page, '/')
  await page.getByRole('button', { name: /チャットを開く/ }).click()
  await expect(page.getByRole('dialog', { name: 'FAQ Assistant' })).toBeVisible()
})
