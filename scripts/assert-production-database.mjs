import { pathToFileURL } from 'node:url'

function normalize(value) {
  return value?.trim().toLowerCase() ?? ''
}

function configuredTarget(env, prefix) {
  return {
    host: normalize(env[`PAYLOAD_${prefix}_DATABASE_HOST`]),
    database: normalize(env[`PAYLOAD_${prefix}_DATABASE_NAME`]),
  }
}

function isValidTarget(target) {
  return /^[a-z0-9.-]+$/.test(target.host) && /^[a-z_][a-z0-9_]*$/.test(target.database)
}

function isSameTarget(a, b) {
  return a.host === b.host && a.database === b.database
}

function targetsDatabase(url, target) {
  const hostname = normalize(url.hostname)

  let pathname
  try {
    pathname = normalize(decodeURIComponent(url.pathname))
  } catch {
    return false
  }

  return hostname === target.host && pathname === `/${target.database}`
}

/**
 * Read-only Production build guard. A mismatched DATABASE_URL must stop a deploy
 * before building code that could subsequently touch another environment's DB.
 * Never print the URL, credentials, or its query parameters.
 */
export function assertProductionDatabaseTarget(env = process.env) {
  if (env.CONTEXT?.trim() !== 'production') {
    throw new Error('Production DB target guard requires Netlify production context')
  }

  const productionTarget = configuredTarget(env, 'PRODUCTION')
  const previewTarget = configuredTarget(env, 'PREVIEW')
  if (
    !isValidTarget(productionTarget) ||
    !isValidTarget(previewTarget) ||
    isSameTarget(productionTarget, previewTarget)
  ) {
    throw new Error('Production and Preview database targets must be valid and distinct')
  }

  const databaseUrl = env.DATABASE_URL?.trim()
  if (!databaseUrl) {
    throw new Error('Production DATABASE_URL is not configured')
  }

  let url
  try {
    url = new URL(databaseUrl)
  } catch {
    throw new Error('Production DATABASE_URL is not a valid URL')
  }

  if (url.protocol !== 'postgresql:' && url.protocol !== 'postgres:') {
    throw new Error('Production DATABASE_URL must use PostgreSQL')
  }
  if (targetsDatabase(url, previewTarget)) {
    throw new Error('Production deployment must not target the Preview database')
  }
  if (!targetsDatabase(url, productionTarget)) {
    throw new Error('Production DATABASE_URL does not target the configured Production database')
  }

  return {
    context: 'production',
    host: productionTarget.host,
    database: productionTarget.database,
  }
}

const isExecutedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href

if (isExecutedDirectly) {
  try {
    const result = assertProductionDatabaseTarget()
    console.log(
      `[production-db-guard] verified ${result.context} database ${result.database} on ${result.host}`,
    )
  } catch (error) {
    // Only emit constant validation messages, never the supplied connection string.
    const message = error instanceof Error ? error.message : 'unknown production DB guard error'
    console.error(`[production-db-guard] ${message}`)
    process.exitCode = 1
  }
}
