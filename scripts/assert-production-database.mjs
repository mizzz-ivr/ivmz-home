import { pathToFileURL } from 'node:url'

function normalize(value) {
  return value?.trim().toLowerCase() ?? ''
}

function targetsSupabaseProject(url, projectRef) {
  const hostname = normalize(url.hostname)
  const directHost = `db.${projectRef}.supabase.co`
  if (hostname === directHost) return true

  if (!hostname.endsWith('.pooler.supabase.com')) return false

  let username
  try {
    username = normalize(decodeURIComponent(url.username))
  } catch {
    return false
  }
  return username === `postgres.${projectRef}`
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

  const expectedRef = normalize(env.PAYLOAD_PRODUCTION_DATABASE_PROJECT_REF)
  const previewRef = normalize(env.PAYLOAD_PREVIEW_DATABASE_PROJECT_REF)
  if (
    !/^[a-z0-9]{20}$/.test(expectedRef) ||
    !/^[a-z0-9]{20}$/.test(previewRef) ||
    expectedRef === previewRef
  ) {
    throw new Error('Production and Preview project references must be valid and distinct')
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
  if (targetsSupabaseProject(url, previewRef)) {
    throw new Error('Production deployment must not target the Preview project')
  }
  if (!targetsSupabaseProject(url, expectedRef)) {
    throw new Error('Production DATABASE_URL does not target the configured Production project')
  }

  return { context: 'production', projectRef: expectedRef }
}

const isExecutedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href

if (isExecutedDirectly) {
  try {
    const result = assertProductionDatabaseTarget()
    console.log(`[production-db-guard] verified ${result.context} Supabase project ${result.projectRef}`)
  } catch (error) {
    // Only emit constant validation messages, never the supplied connection string.
    const message = error instanceof Error ? error.message : 'unknown production DB guard error'
    console.error(`[production-db-guard] ${message}`)
    process.exitCode = 1
  }
}
