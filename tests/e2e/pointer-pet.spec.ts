import { expect, test } from '@playwright/test'

import { gotoExpected, reloadExpected } from './navigation'

test('desktop pet follows the mouse without blocking clicks and can be disabled', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Fine-pointer desktop check')

  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await gotoExpected(page, '/')
  const pet = page.getByTestId('cursor-pet')

  await expect(pet).toBeAttached()
  await expect(pet).toHaveCSS('pointer-events', 'none')
  await expect(pet).toHaveAttribute('data-ready', 'true')
  await page.mouse.move(450, 240)
  await expect(pet).toHaveClass(/is-active/)

  await expect
    .poll(async () => {
      const rect = await pet.boundingBox()
      return rect !== null && rect.x >= 0 && rect.y >= 0 && rect.x + rect.width <= 1280
    })
    .toBe(true)

  const toggle = page.getByRole('button', { name: /PET ON/ })
  await toggle.click()
  await expect(page.getByRole('button', { name: /PET OFF/ })).toHaveAttribute(
    'aria-pressed',
    'false',
  )
  await expect(pet).not.toHaveClass(/is-active/)

  await reloadExpected(page, '/')
  await page.mouse.move(500, 320)
  await expect(page.getByTestId('cursor-pet')).not.toHaveClass(/is-active/)
})

test('reduced motion disables the decorative companion', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Desktop reduced-motion check')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await gotoExpected(page, '/')
  await page.mouse.move(500, 300)
  await expect(page.getByTestId('cursor-pet')).toBeHidden()
})

test('touchscreen never shows the decorative companion', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-webkit', 'Touchscreen only')
  await gotoExpected(page, '/')
  await expect(page.getByTestId('cursor-pet')).toBeHidden()
})
