import { expect, test } from '@playwright/test'

import { gotoExpected } from './navigation'

test('the original 3D mascot is optional and never steals pointer interaction', async ({
  page,
}) => {
  await page.addInitScript(() => window.localStorage.setItem('ivmz-follow-pet', 'off'))
  await gotoExpected(page, '/')

  const canvas = page.locator('canvas[data-testid="mascot-3d"]')
  const toggle = page.locator('button.mascot-3d-toggle')

  await expect(canvas).toHaveAttribute('aria-hidden', 'true')
  await expect(canvas).toHaveCSS('pointer-events', 'none')
  await expect(canvas).toHaveAttribute('data-active', 'false')
  await expect(toggle).toHaveAttribute('aria-pressed', 'false')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Selected Works' })).toBeVisible()

  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-pressed', 'true')
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-pressed', 'false')
  await expect(canvas).toHaveAttribute('data-active', 'false')
})

test('reduced-motion never requests WebGL mascot assets or activates the canvas', async ({
  page,
}) => {
  const fetched: string[] = []
  await page.emulateMedia({ reducedMotion: 'reduce' })
  page.on('request', (request) => {
    if (request.url().includes('/mascot/ivmz-mascot-v1.glb')) fetched.push(request.url())
  })
  await gotoExpected(page, '/')
  await page.mouse.move(320, 300)

  await expect(page.locator('canvas[data-testid="mascot-3d"]')).toHaveAttribute(
    'data-active',
    'false',
  )
  expect(fetched).toHaveLength(0)
})

test('a real original GLB asset is served by the site', async ({ request }) => {
  const result = await request.get('/mascot/ivmz-mascot-v1.glb')
  expect(result.ok()).toBe(true)
  const body = await result.body()
  expect(body.byteLength).toBeGreaterThan(1000)
  expect(body.subarray(0, 4).toString('ascii')).toBe('glTF')
})

test('a failed model download does not retry on every pointer move', async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'Desktop mouse input is tested in Chromium')
  let attempted = 0
  await page.route('**/mascot/ivmz-mascot-v1.glb', async (route) => {
    attempted += 1
    await route.fulfill({ status: 503, body: 'temporarily unavailable' })
  })
  await page.addInitScript(() => window.localStorage.setItem('ivmz-follow-pet', 'on'))
  await gotoExpected(page, '/')

  const canvas = page.locator('canvas[data-testid="mascot-3d"]')
  await expect(canvas).toHaveAttribute('data-ready', 'true')
  const supported = await page.evaluate(
    () =>
      matchMedia('(hover: hover) and (pointer: fine)').matches &&
      !matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  test.skip(!supported, 'The test browser does not support fine pointer interaction')

  await page.mouse.move(260, 240)
  await expect.poll(() => attempted, { timeout: 15_000 }).toBe(1)
  await page.mouse.move(310, 300)
  await page.mouse.move(450, 380)
  await page.waitForTimeout(300)

  expect(attempted).toBe(1)
  await expect(canvas).toHaveAttribute('data-active', 'false')
  await expect(page.getByRole('link', { name: 'Selected Works' })).toBeVisible()
})

test('3D mascot renders and follows mouse', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Desktop WebGL2 playback is verified in Chromium')
  await page.addInitScript(() => window.localStorage.setItem('ivmz-follow-pet', 'on'))
  await gotoExpected(page, '/')

  const webgl2Available = await page.evaluate(() => {
    const probe = document.createElement('canvas')
    const context = probe.getContext('webgl2')
    return context !== null
  })
  test.skip(!webgl2Available, 'The CI browser does not provide a WebGL2 renderer')

  const canvas = page.locator('canvas[data-testid="mascot-3d"]')
  await expect(canvas).toHaveAttribute('data-ready', 'true')
  await page.mouse.move(280, 220)
  await expect(canvas).toHaveAttribute('data-active', 'true', { timeout: 15_000 })
  const before = await canvas.getAttribute('style')

  await page.mouse.move(650, 360)
  await expect.poll(() => canvas.getAttribute('style'), { timeout: 10_000 }).not.toBe(before)
  await expect(canvas).toHaveCSS('pointer-events', 'none')
})
