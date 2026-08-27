import { expect, type Page, type Response } from '@playwright/test'

const remoteNavigationDelayMs = process.env.E2E_BASE_URL ? 100 : 0
const remoteNavigationTimeoutMs = process.env.E2E_BASE_URL ? 12_000 : undefined
const remoteNavigationAttempts = process.env.E2E_BASE_URL ? 2 : 1

async function paceRemoteNavigation(page: Page) {
  if (remoteNavigationDelayMs > 0) {
    await page.waitForTimeout(remoteNavigationDelayMs)
  }
}

async function navigationDiagnostic(response: Response | null) {
  if (!response) return 'navigation returned no response'

  const headers = response.headers()
  let body = ''

  try {
    body = (await response.text()).replace(/\s+/g, ' ').slice(0, 1_000)
  } catch (error) {
    body = `body unavailable: ${String(error)}`
  }

  return [
    `status=${response.status()}`,
    `url=${response.url()}`,
    `content-type=${headers['content-type'] ?? 'unknown'}`,
    `server=${headers.server ?? 'unknown'}`,
    `request-id=${headers['x-nf-request-id'] ?? 'unknown'}`,
    `body=${body}`,
  ].join(' ')
}

async function assertExpectedStatus(
  response: Response | null,
  label: string,
  expectedStatus: number,
) {
  const status = response?.status()
  if (status !== expectedStatus) {
    expect(status, `${label}: ${await navigationDiagnostic(response)}`).toBe(expectedStatus)
  }
}

async function withTransientNavigationRetry<T>(
  page: Page,
  navigate: () => Promise<T>,
): Promise<T> {
  let lastError: unknown

  for (let attempt = 1; attempt <= remoteNavigationAttempts; attempt += 1) {
    try {
      await paceRemoteNavigation(page)
      return await navigate()
    } catch (error) {
      lastError = error
      if (attempt === remoteNavigationAttempts) throw error
    }
  }

  throw lastError
}

export async function gotoExpected(
  page: Page,
  url: string,
  expectedStatus = 200,
) {
  const response = await withTransientNavigationRetry(page, () =>
    page.goto(url, { waitUntil: 'commit', timeout: remoteNavigationTimeoutMs }),
  )
  await assertExpectedStatus(response, url, expectedStatus)
  return response
}

export async function reloadExpected(
  page: Page,
  label: string,
  expectedStatus = 200,
) {
  const response = await withTransientNavigationRetry(page, () =>
    page.reload({ waitUntil: 'commit', timeout: remoteNavigationTimeoutMs }),
  )
  await assertExpectedStatus(response, `${label} reload`, expectedStatus)
  return response
}
