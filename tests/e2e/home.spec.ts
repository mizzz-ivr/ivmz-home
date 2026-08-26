import { expect, test } from '@playwright/test'

test('renders the complete home experience without animation gates', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { level: 1 })).toContainText('いゔる。')
  await expect(page.getByRole('link', { name: 'Selected Works' })).toBeVisible()
  await expect(page.getByAltText('mizzzのGitHubアイコンに使用しているオリジナルキャラクター')).toBeVisible()

  for (const heading of ['Built in public.','From interface','画面の向こう側まで、つくる。','Notes become','What is moving now.','Public plans,','Find the live edges.','Let’s make something']) {
    await expect(page.getByRole('heading', { name: new RegExp(heading) })).toBeAttached()
  }
})

test('toggles and persists the visual theme across routes', async ({ page }) => {
  await page.goto('/')
  const root = page.locator('html')
  const before = await root.getAttribute('data-theme')
  expect(['dark', 'light']).toContain(before)

  await page.getByRole('button', { name: 'テーマを切り替える' }).click()
  const after = await root.getAttribute('data-theme')
  expect(after).not.toBe(before)

  await page.goto('/about')
  await expect(root).toHaveAttribute('data-theme', after ?? 'dark')

  await page.reload()
  await expect(root).toHaveAttribute('data-theme', after ?? 'dark')
})

test('stays overflow-free at every required responsive width', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Responsive width matrix runs in Chromium')

  for (const width of [320, 375, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    const dimensions = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }))
    expect(dimensions.scrollWidth, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(dimensions.clientWidth + 1)
  }
})

test('desktop navigation expands for keyboard focus', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Desktop keyboard behavior only')
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/')

  const shell = page.locator('.desktop-nav-shell')
  const homeLink = page.getByRole('navigation', { name: 'Desktop navigation' }).getByRole('link', { name: 'HOME' })
  await homeLink.focus()
  await expect(homeLink).toBeFocused()
  await expect.poll(async () => (await shell.boundingBox())?.width ?? 0).toBeGreaterThan(500)
})

test('mobile drawer supports keyboard escape and closes after route navigation', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-webkit', 'Mobile drawer only')
  await page.goto('/')

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
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Selected Works' })).toBeVisible()
  await expect(page.locator('.signature-intro')).toHaveCSS('visibility', 'hidden')
})
