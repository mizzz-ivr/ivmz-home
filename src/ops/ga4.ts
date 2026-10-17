import { sign } from 'node:crypto'

type Fetcher = typeof fetch
type Credentials = { client_email: string; private_key: string }
export type AnalyticsSummary =
  | { state: 'not-configured' }
  | { state: 'unavailable' }
  | {
      state: 'ok'
      last7d: { activeUsers: number; views: number }
      last30d: { activeUsers: number; views: number }
      topPages: Array<{ path: string; views: number }>
    }

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_REPORT_URL = 'https://analyticsdata.googleapis.com/v1beta/properties'
const GOOGLE_READONLY_SCOPE = 'https://www.googleapis.com/auth/analytics.readonly'
const REQUEST_TIMEOUT_MS = 3_000
const CACHE_MS = 5 * 60_000
let cached: { key: string; result: AnalyticsSummary; expires: number } | null = null

function parseConfig(env: NodeJS.ProcessEnv) {
  const property = env.GA4_PROPERTY_ID?.trim()
  const raw = env.GA4_SERVICE_ACCOUNT_JSON
  if (!property || !/^\d{6,20}$/.test(property) || !raw) return null
  try {
    const parsed = JSON.parse(raw) as Credentials
    if (
      typeof parsed.client_email !== 'string' ||
      !parsed.client_email.endsWith('.gserviceaccount.com') ||
      typeof parsed.private_key !== 'string' ||
      !parsed.private_key.includes('BEGIN PRIVATE KEY')
    ) return null
    return { credentials: parsed, property }
  } catch {
    return null
  }
}

function encode(value: unknown) {
  return Buffer.from(JSON.stringify(value)).toString('base64url')
}

function issueAssertion(credentials: Credentials, now = Date.now()) {
  const issuedAt = Math.floor(now / 1_000)
  const header = encode({ alg: 'RS256', typ: 'JWT' })
  const payload = encode({
    iss: credentials.client_email,
    scope: GOOGLE_READONLY_SCOPE,
    aud: GOOGLE_TOKEN_URL,
    iat: issuedAt,
    exp: issuedAt + 3_300,
  })
  const body = `${header}.${payload}`
  const signature = sign('RSA-SHA256', Buffer.from(body), credentials.private_key)
  return `${body}.${signature.toString('base64url')}`
}

async function accessToken(credentials: Credentials, fetcher: Fetcher) {
  const assertion = issueAssertion(credentials)
  const response = await fetcher(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      assertion,
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    }),
    cache: 'no-store',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })
  if (!response.ok) throw new Error('ga4_oauth_unavailable')
  const result = (await response.json()) as { access_token?: unknown }
  if (typeof result.access_token !== 'string' || !result.access_token) {
    throw new Error('ga4_oauth_missing_token')
  }
  return result.access_token
}

type Report = {
  rows?: Array<{
    dimensionValues?: Array<{ value?: string }>
    metricValues?: Array<{ value?: string }>
  }>
}

function isPublicReportPath(path: string): boolean {
  return (
    path.startsWith('/') &&
    !path.startsWith('//') &&
    !path.includes('?') &&
    !/^\/(admin|api|contact|message|legal)(\/|$)/.test(path)
  )
}

function asCount(value: unknown): number {
  const count = Number(value)
  return Number.isSafeInteger(count) && count >= 0 ? count : 0
}

async function runReport(
  property: string,
  token: string,
  body: object,
  fetcher: Fetcher,
): Promise<Report> {
  const response = await fetcher(`${GOOGLE_REPORT_URL}/${property}:runReport`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })
  if (!response.ok) throw new Error('ga4_report_unavailable')
  return (await response.json()) as Report
}

function metricReport(days: number) {
  return {
    dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'today' }],
    metrics: [{ name: 'activeUsers' }, { name: 'screenPageViews' }],
  }
}

/**
 * Aggregated reports only. Called from authenticated Payload server components;
 * returns neither credentials, request bodies nor visitor data.
 */
export async function fetchGA4Summary(
  env: NodeJS.ProcessEnv = process.env,
  fetcher: Fetcher = fetch,
): Promise<AnalyticsSummary> {
  const config = parseConfig(env)
  if (!config) return { state: 'not-configured' }

  try {
    const token = await accessToken(config.credentials, fetcher)
    const [week, month, pages] = await Promise.all([
      runReport(config.property, token, metricReport(7), fetcher),
      runReport(config.property, token, metricReport(30), fetcher),
      runReport(
        config.property,
        token,
        {
          dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
          dimensions: [{ name: 'pagePath' }],
          metrics: [{ name: 'screenPageViews' }],
          orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
          limit: '20',
        },
        fetcher,
      ),
    ])

    const stats = (report: Report) => ({
      activeUsers: asCount(report.rows?.[0]?.metricValues?.[0]?.value),
      views: asCount(report.rows?.[0]?.metricValues?.[1]?.value),
    })
    return {
      state: 'ok',
      last7d: stats(week),
      last30d: stats(month),
      topPages: (pages.rows ?? [])
        .map((row) => ({
          path: row.dimensionValues?.[0]?.value ?? '',
          views: asCount(row.metricValues?.[0]?.value),
        }))
        .filter((row) => isPublicReportPath(row.path))
        .slice(0, 5),
    }
  } catch {
    return { state: 'unavailable' }
  }
}

export async function cachedGA4Summary(): Promise<AnalyticsSummary> {
  const key = process.env.GA4_PROPERTY_ID ?? ''
  if (cached && cached.key === key && cached.expires > Date.now()) return cached.result
  const result = await fetchGA4Summary()
  cached = {
    key,
    result,
    expires: Date.now() + (result.state === 'ok' ? CACHE_MS : 60_000),
  }
  return result
}
