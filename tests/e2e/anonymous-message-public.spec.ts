import { expect, test } from '@playwright/test'

test('never displays a shared message before the public pages flag is enabled', async ({
  request,
}) => {
  const oldShareId = 'J6-vhsw_vSh1sEOWVtR-7K1W'
  for (const path of [`/message/${oldShareId}`, `/message/${oldShareId}/opengraph-image`]) {
    const response = await request.get(path)
    expect(response.status()).toBe(404)
    // No-store response headers are verified independently in production PR #136.
  }
})

test('does not expose private data in missing message responses', async ({ request }) => {
  const response = await request.get('/message/../../private')
  expect(response.status()).toBeGreaterThanOrEqual(400)
  expect(await response.text()).not.toContain('internalNote')
})
