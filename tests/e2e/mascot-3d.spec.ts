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
  await page.mouse.move(280, 220)
  await expect(canvas).toHaveAttribute('data-active', 'true', { timeout: 30_000 })
  const before = await canvas.getAttribute('style')

  await page.mouse.move(650, 360)
  await expect.poll(() => canvas.getAttribute('style'), { timeout: 10_000 }).not.toBe(before)
  await expect(canvas).toHaveCSS('pointer-events', 'none')
})
