import { expect, type Page, type Response } from '@playwright/test'

const isRemotePreview = Boolean(process.env.E2E_BASE_URL)
const remoteNavigationDelayMs = isRemotePreview ? 100 : 0
const navigationTransportAttempts = isRemotePreview ? 2 : 1
const remoteNavigationTimeoutMs = 12_000

async function paceRemoteNavigation(page: Page) {
  if (remoteNavigationDelayMs > 0) {
    await page.waitForTimeout(remoteNavigationDelayMs)
  }
}

function isTransientNavigationError(error: unknown) {
  if (!isRemotePreview) return false

  const message = String(error)
  return (
    message.includes('net::ERR_ABORTED') ||
    message.includes('Operation was cancelled') ||
    message.includes('frame was detached') ||
    /page\.(?:goto|reload): Timeout \d+ms exceeded/.test(message)
  )
}

async function withNavigationTransportRetry(
  page: Page,
  navigate: () => Promise<Response | null>,
) {
  let lastTransportError: unknown

  for (let attempt = 1; attempt <= navigationTransportAttempts; attempt += 1) {
    await paceRemoteNavigation(page)

    try {
      return await navigate()
    } catch (error) {
      lastTransportError = error
      if (attempt === navigationTransportAttempts || !isTransientNavigationError(error)) {
        throw error
      }
      await page.waitForTimeout(500)
    }
  }

  throw lastTransportError
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

export async function gotoExpected(page: Page, url: string, expectedStatus = 200) {
  const response = await withNavigationTransportRetry(page, () =>
    page.goto(url, {
      waitUntil: 'commit',
      ...(isRemotePreview ? { timeout: remoteNavigationTimeoutMs } : {}),
    }),
  )
  await assertExpectedStatus(response, url, expectedStatus)
  return response
}

export async function reloadExpected(page: Page, label: string, expectedStatus = 200) {
  const response = await withNavigationTransportRetry(page, () =>
    page.reload({
      waitUntil: 'commit',
      ...(isRemotePreview ? { timeout: remoteNavigationTimeoutMs } : {}),
    }),
  )
  await assertExpectedStatus(response, `${label} reload`, expectedStatus)
  return response
}
