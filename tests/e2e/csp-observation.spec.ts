import { expect, test, type Page, type TestInfo } from '@playwright/test'

type SanitizedCspViolation = {
  blocked: string
  disposition: string
  effectiveDirective: string
  violatedDirective: string
}

type ObservationWindow = Window & {
  __ivmzCspViolations?: SanitizedCspViolation[]
}

const publicObservationRoutes = [
  '/',
  '/about',
  '/works',
  '/blog',
  '/news',
  '/schedule',
  '/links',
  '/contact',
  '/admin',
] as const

const authenticatedAdminRoutes = [
  '/admin',
  '/admin/collections/works',
  '/admin/collections/posts',
] as const

function dedupeViolations(violations: SanitizedCspViolation[]) {
  const unique = new Map<string, SanitizedCspViolation>()

  for (const violation of violations) {
    const key = [
      violation.effectiveDirective,
      violation.violatedDirective,
      violation.disposition,
      violation.blocked,
    ].join('|')
    unique.set(key, violation)
  }

  return [...unique.values()].sort((left, right) =>
    `${left.effectiveDirective}|${left.blocked}`.localeCompare(
      `${right.effectiveDirective}|${right.blocked}`,
    ),
  )
}

async function installCspObserver(page: Page) {
  await page.addInitScript(() => {
    const observationWindow = window as ObservationWindow
    observationWindow.__ivmzCspViolations = []

    const sanitizeBlockedUri = (blockedUri: string, documentUri: string) => {
      const value = blockedUri.trim()
      if (!value) return 'unknown'

      if (['inline', 'eval', 'wasm-eval', 'trusted-types-sink'].includes(value)) {
        return value
      }

      if (value === 'self') return "'self'"
      if (value.startsWith('data:')) return 'data:'
      if (value.startsWith('blob:')) return 'blob:'

      try {
        const blocked = new URL(value, documentUri)
        const documentUrl = new URL(documentUri)
        return blocked.origin === documentUrl.origin ? "'self'" : blocked.origin
      } catch {
        const scheme = value.match(/^([a-z][a-z0-9+.-]*):/i)?.[1]
        return scheme ? `${scheme.toLowerCase()}:` : 'opaque'
      }
    }

    window.addEventListener('securitypolicyviolation', (event) => {
      observationWindow.__ivmzCspViolations?.push({
        blocked: sanitizeBlockedUri(event.blockedURI, event.documentURI),
        disposition: event.disposition,
        effectiveDirective: event.effectiveDirective,
        violatedDirective: event.violatedDirective,
      })
    })
  })
}

async function observeRoute(page: Page, route: string, testInfo: TestInfo) {
  const response = await page.goto(route, { waitUntil: 'domcontentloaded' })
  expect(response, `${route}: navigation response`).not.toBeNull()

  if (!response) return

  expect(response.status(), `${route}: status`).toBeLessThan(500)

  const headers = response.headers()
  expect(
    headers['content-security-policy-report-only'],
    `${route}: Report-Only header`,
  ).toBeTruthy()
  expect(
    headers['content-security-policy'],
    `${route}: enforcing CSP must stay disabled`,
  ).toBeUndefined()

  await page.waitForTimeout(1_000)

  const violations = dedupeViolations(
    await page.evaluate(() => (window as ObservationWindow).__ivmzCspViolations ?? []),
  )

  // Intentionally emit only sanitized fields. Do not add documentURI, sourceFile,
  // line/column, sample, request bodies, cookies, tokens, or query strings here.
  console.info(
    `CSP_OBSERVATION ${JSON.stringify({
      project: testInfo.project.name,
      route,
      violations,
    })}`,
  )
}

test.describe('CSP Report-Only observation', () => {
  test('public routes and Payload Admin login surface expose sanitized violations only', async ({
    page,
  }, testInfo) => {
    await installCspObserver(page)

    for (const route of publicObservationRoutes) {
      await observeRoute(page, route, testInfo)
    }
  })

  test('Payload public API remains Report-Only and is not accidentally enforced', async ({
    request,
  }) => {
    const response = await request.get('/api/works?limit=1&depth=0')
    expect(response.status()).toBe(200)

    const headers = response.headers()
    expect(headers['content-security-policy-report-only']).toBeTruthy()
    expect(headers['content-security-policy']).toBeUndefined()
  })

  test('authenticated Payload Admin observation is explicit local opt-in and read-only', async ({
    browser,
  }, testInfo) => {
    const storageState = process.env.CSP_ADMIN_STORAGE_STATE
    test.skip(
      !storageState,
      'Set CSP_ADMIN_STORAGE_STATE to a local, untracked Playwright storage-state file to observe authenticated Admin routes.',
    )

    const baseURL = process.env.E2E_BASE_URL
    if (!baseURL) {
      throw new Error('E2E_BASE_URL is required when CSP_ADMIN_STORAGE_STATE is set.')
    }

    const context = await browser.newContext({
      baseURL,
      storageState,
    })
    const page = await context.newPage()
    await installCspObserver(page)

    try {
      for (const route of authenticatedAdminRoutes) {
        await observeRoute(page, route, testInfo)
      }
    } finally {
      await context.close()
    }
  })
})
