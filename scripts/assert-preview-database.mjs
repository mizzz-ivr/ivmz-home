import { pathToFileURL } from 'node:url'

const PREVIEW_CONTEXTS = new Set(['deploy-preview', 'branch-deploy'])

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

export function assertPreviewDatabaseTarget(env = process.env) {
  const context = env.CONTEXT?.trim()
  const databaseUrl = env.DATABASE_URL?.trim()
  const previewTarget = configuredTarget(env, 'PREVIEW')
  const productionTarget = configuredTarget(env, 'PRODUCTION')

  if (!PREVIEW_CONTEXTS.has(context)) {
    throw new Error(`database migration is disabled for Netlify context: ${context || 'unset'}`)
  }

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not configured for the preview deploy context')
  }

  if (
    !isValidTarget(previewTarget) ||
    !isValidTarget(productionTarget) ||
    isSameTarget(previewTarget, productionTarget)
  ) {
    throw new Error('Preview and Production database targets must be valid and distinct')
  }

  let parsedDatabaseUrl
  try {
    parsedDatabaseUrl = new URL(databaseUrl)
  } catch {
    throw new Error('DATABASE_URL is not a valid URL')
  }

  if (!['postgres:', 'postgresql:'].includes(parsedDatabaseUrl.protocol)) {
    throw new Error('DATABASE_URL must use the postgres or postgresql protocol')
  }

  if (targetsDatabase(parsedDatabaseUrl, productionTarget)) {
    throw new Error('refusing to migrate the Production database from a preview deploy')
  }

  if (!targetsDatabase(parsedDatabaseUrl, previewTarget)) {
    throw new Error('DATABASE_URL does not target the configured Preview database')
  }

  return {
    context,
    host: previewTarget.host,
    database: previewTarget.database,
  }
}

const isExecutedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href

if (isExecutedDirectly) {
  try {
    const result = assertPreviewDatabaseTarget()
    console.log(
      `[preview-db-guard] verified ${result.context} targets database ${result.database} on ${result.host}`,
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown preview database guard error'
    console.error(`[preview-db-guard] ${message}`)
    process.exitCode = 1
  }
}
