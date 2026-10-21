import { pathToFileURL } from 'node:url'

const PRODUCTION_ORIGIN = 'https://ivmz.ivrm.jp'

/**
 * GET-only production smoke. Never authenticate, submit a form, read private
 * records, follow a redirect, or log a response body.
 */
export const publicReleaseProbes = [
  ...[
    '/',
    '/about',
    '/works',
    '/blog',
    '/news',
    '/schedule',
    '/links',
    '/contact',
    '/legal/privacy',
    '/legal/terms',
  ].map((path) => ({ path, status: [200], mime: 'text/html', csp: path === '/' })),
  { path: '/robots.txt', status: [200], mime: 'text/plain' },
  { path: '/sitemap.xml', status: [200], mime: 'xml' },
  {
    path: '/api/works?limit=1&depth=0',
    status: [200],
    mime: 'application/json',
    docs: true,
    csp: true,
  },
  {
    path: '/admin',
    status: [200, 302, 303, 307, 308],
    mime: 'text/html',
    csp: true,
    admin: true,
  },
  { path: '/api/ops/health', status: [401, 404], noStore: true },
  {
    path: '/message/this-is-not-a-public-message',
    status: [404],
    noStore: true,
    noIndex: true,
  },
]

function must(condition, path, explanation) {
  if (!condition) throw new Error(`Release smoke failed at ${path}: ${explanation}`)
}

export async function verifyProductionReadOnly({ request = fetch } = {}) {
  const checked = []

  for (const probe of publicReleaseProbes) {
    const url = new URL(probe.path, PRODUCTION_ORIGIN)
    must(url.origin === PRODUCTION_ORIGIN, probe.path, 'origin mismatch')

    let response
    try {
      response = await request(url, {
        method: 'GET',
        redirect: 'manual',
        credentials: 'omit',
        signal: AbortSignal.timeout(15_000),
      })
    } catch {
      throw new Error(`Release smoke failed at ${probe.path}: network or timeout`)
    }

    must(
      probe.status.includes(response.status),
      probe.path,
      `unexpected HTTP status ${response.status}`,
    )
    const headers = response.headers
    const isRedirect = response.status >= 300 && response.status < 400

    if (isRedirect) {
      const location = headers.get('location')
      must(probe.admin && !!location, probe.path, 'unexpected redirect')
      let next
      try {
        next = new URL(location, url)
      } catch {
        throw new Error(`Release smoke failed at ${probe.path}: invalid redirect`)
      }
      must(next.origin === PRODUCTION_ORIGIN, probe.path, 'cross-origin redirect')
    } else {
      if (probe.mime) {
        must(
          (headers.get('content-type') ?? '').toLowerCase().includes(probe.mime),
          probe.path,
          'unexpected content type',
        )
      }
      if (probe.csp) {
        must(
          !!headers.get('content-security-policy-report-only'),
          probe.path,
          'CSP Report-Only missing',
        )
        must(!headers.get('content-security-policy'), probe.path, 'unexpected enforcing CSP')
      }
    }

    if (probe.noStore) {
      must(
        (headers.get('cache-control') ?? '').toLowerCase().includes('no-store'),
        probe.path,
        'no-store missing',
      )
    }
    if (probe.noIndex) {
      must(
        (headers.get('x-robots-tag') ?? '').toLowerCase().includes('noindex'),
        probe.path,
        'noindex missing',
      )
    }
    if (probe.docs) {
      let document
      try {
        document = await response.json()
      } catch {
        throw new Error(`Release smoke failed at ${probe.path}: invalid JSON`)
      }
      must(Array.isArray(document?.docs), probe.path, 'public collection shape mismatch')
    }

    checked.push({ path: probe.path, status: response.status })
  }

  return checked
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  verifyProductionReadOnly()
    .then((checked) => {
      for (const item of checked) console.info(`OK ${item.path}: HTTP ${item.status}`)
      console.info(`Read-only Production smoke passed: ${checked.length} endpoints`)
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : 'Release smoke failed')
      process.exitCode = 1
    })
}
