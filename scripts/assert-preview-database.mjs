import { pathToFileURL } from 'node:url'

const PREVIEW_CONTEXTS = new Set(['deploy-preview', 'branch-deploy'])

function normalize(value) {
  return value?.trim().toLowerCase() ?? ''
}

function containsProjectRef(url, projectRef) {
  const expectedRef = normalize(projectRef)
  const hostname = normalize(url.hostname)
  const username = normalize(decodeURIComponent(url.username))

  if (!expectedRef) return false

  const isDirectConnection = hostname === `db.${expectedRef}.supabase.co`
  const isPoolerConnection =
    hostname.endsWith('.pooler.supabase.com') &&
    (username === `postgres.${expectedRef}` || username.endsWith(`.${expectedRef}`))

  return isDirectConnection || isPoolerConnection
}

export function assertPreviewDatabaseTarget(env = process.env) {
  const context = env.CONTEXT?.trim()
  const databaseUrl = env.DATABASE_URL?.trim()
  const previewProjectRef = normalize(env.PAYLOAD_PREVIEW_DATABASE_PROJECT_REF)
  const productionProjectRef = normalize(env.PAYLOAD_PRODUCTION_DATABASE_PROJECT_REF)

  if (!PREVIEW_CONTEXTS.has(context)) {
    throw new Error(`database migration is disabled for Netlify context: ${context || 'unset'}`)
  }

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not configured for the preview deploy context')
  }

  if (!/^[a-z0-9]+$/.test(previewProjectRef)) {
    throw new Error('PAYLOAD_PREVIEW_DATABASE_PROJECT_REF is missing or invalid')
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

  if (productionProjectRef && containsProjectRef(parsedDatabaseUrl, productionProjectRef)) {
    throw new Error('refusing to migrate the Production Supabase project from a preview deploy')
  }

  if (!containsProjectRef(parsedDatabaseUrl, previewProjectRef)) {
    throw new Error('DATABASE_URL does not target the configured Preview Supabase project')
  }

  return {
    context,
    projectRef: previewProjectRef,
  }
}

const isExecutedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href

if (isExecutedDirectly) {
  try {
    const result = assertPreviewDatabaseTarget()
    console.log(
      `[preview-db-guard] verified ${result.context} targets Supabase project ${result.projectRef}`,
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown preview database guard error'
    console.error(`[preview-db-guard] ${message}`)
    process.exitCode = 1
  }
}
