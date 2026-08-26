import { expect, test } from '@playwright/test'

test('renders the complete home experience without animation gates', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { level: 1 })).toContainText('いゔる。')
  await expect(page.getByRole('link', { name: 'Selected Works' })).toBeVisible()
  await expect(
    page.getByAltText('mizzzのGitHubアイコンに使用しているオリジナルキャラクター'),
  ).toBeVisible()

  for (const heading of [
    'Built in public.',
    'From interface',
    '画面の向こう側まで、つくる。',
    'Notes become',
    'What is moving now.',
    'Public plans,',
    'Find the live edges.',
    'Let’s make something',
  ]) {
    await expect(page.getByRole('heading', { name: new RegExp(heading) })).toBeAttached()
  }
})

test('toggles and persists the visual theme', async ({ page }) => {
  await page.goto('/')
  const root = page.locator('html')
  const before = await root.getAttribute('data-theme')
  expect(['dark', 'light']).toContain(before)

  await page.getByRole('button', { name: /テーマを.+へ切り替える/ }).click()
  const after = await root.getAttribute('data-theme')
  expect(after).not.toBe(before)

  await page.reload()
  await expect(root).toHaveAttribute('data-theme', after ?? 'dark')
})

test('has no page-level horizontal overflow', async ({ page }) => {
  await page.goto('/')
  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }))
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1)
})

test('mobile drawer supports keyboard escape and closes after navigation', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-webkit', 'Mobile drawer only')
  await page.goto('/')

  const trigger = page.getByRole('button', { name: 'メニューを開く' })
  await trigger.click()
  const drawer = page.locator('#mobile-navigation')
  await expect(trigger).toHaveAttribute('aria-expanded', 'true')
  await expect(drawer).toHaveAttribute('aria-hidden', 'false')

  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'メニューを開く' })).toHaveAttribute(
    'aria-expanded',
    'false',
  )

  await page.getByRole('button', { name: 'メニューを開く' }).click()
  await drawer.getByRole('link', { name: /WORKS/ }).click()
  await expect(page.getByRole('button', { name: 'メニューを開く' })).toHaveAttribute(
    'aria-expanded',
    'false',
  )
})

test('reduced motion keeps primary content immediately usable', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')

  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Selected Works' })).toBeVisible()
  await expect(page.locator('.signature-intro')).toHaveCSS('visibility', 'hidden')
})
