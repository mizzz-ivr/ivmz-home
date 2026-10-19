import { appendFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'

const PRODUCTION_SITE = 'https://ivmz.ivrm.jp'
const MIN_TOKEN_LENGTH = 24

function retentionEndpoint(siteURL) {
  let url
  try {
    url = new URL(siteURL)
  } catch {
    throw new Error('Retention site URL is invalid; no request was sent')
  }
  if (
    url.origin !== PRODUCTION_SITE ||
    url.pathname !== '/' ||
    url.search ||
    url.hash ||
    url.username ||
    url.password
  ) {
    throw new Error('Retention must target the canonical Production origin')
  }
  return new URL('/api/ops/retention', url)
}

/** Never send an apply request or return response bodies that may contain customer information. */
export async function fetchRetentionSummary({ siteURL, token, request = fetch }) {
  if (typeof token !== 'string' || token.length < MIN_TOKEN_LENGTH) {
    throw new Error('OPS_HEALTH_TOKEN is missing or invalid; retention was not checked')
  }
  const endpoint = retentionEndpoint(siteURL)

  let response
  try {
    response = await request(endpoint, {
      body: '{}',
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      method: 'POST',
      redirect: 'error',
      signal: AbortSignal.timeout(60_000),
    })
  } catch {
    throw new Error('Retention check failed (network, timeout, or redirect); no deletion attempted')
  }

  if (response.status === 404) {
    throw new Error(
      'Retention endpoint unavailable (HTTP 404): verify Production deployment and OPS_HEALTH_TOKEN configuration; no deletion attempted',
    )
  }
  if (response.status === 401 || response.status === 403) {
    throw new Error(`Retention check rejected (HTTP ${response.status}): verify ops credentials`)
  }
  if (response.status !== 200) {
    throw new Error(`Retention check failed (HTTP ${response.status}); no deletion attempted`)
  }

  if (!response.headers.get('content-type')?.toLowerCase().includes('application/json')) {
    throw new Error('Retention check returned an unexpected content type')
  }

  let data
  try {
    data = await response.json()
  } catch {
    throw new Error('Retention check returned invalid JSON')
  }

  if (
    !data ||
    data.dryRun !== true ||
    !Number.isSafeInteger(data.days) ||
    data.days < 30 ||
    data.days > 1_825 ||
    !Number.isSafeInteger(data.eligible) ||
    data.eligible < 0 ||
    !Number.isSafeInteger(data.willDeleteNow) ||
    data.willDeleteNow < 0 ||
    data.willDeleteNow > data.eligible ||
    data.willDeleteNow > 200
  ) {
    throw new Error('Retention check returned an invalid dry-run summary; no deletion attempted')
  }

  return {
    days: data.days,
    eligible: data.eligible,
    willDeleteNow: data.willDeleteNow,
  }
}

async function main() {
  const result = await fetchRetentionSummary({
    siteURL: process.env.SITE_URL || PRODUCTION_SITE,
    token: process.env.OPS_HEALTH_TOKEN,
  })

  const summary = `Retention dry-run: days=${result.days}, eligible=${result.eligible}, willDeleteNow=${result.willDeleteNow}`
  console.info(summary)
  if (process.env.GITHUB_STEP_SUMMARY) {
    await appendFile(
      process.env.GITHUB_STEP_SUMMARY,
      `### Contact retention (dry-run only)\n\n${summary}\n`,
    )
  }
}

const isExecutedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href

if (isExecutedDirectly) {
  main().catch((error) => {
    console.error(`::error::${error instanceof Error ? error.message : 'Retention check failed'}`)
    process.exitCode = 1
  })
}
