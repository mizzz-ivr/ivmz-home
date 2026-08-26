import config from '@payload-config'
import { getPayload } from 'payload'

import { getDatabasePoolConfig, resolveDatabasePoolMode } from '@/lib/database-connection'

type SafeError = {
  name?: string
  code?: string
  errno?: string
  syscall?: string
  cause?: SafeError | null
  errors?: SafeError[]
}

function toSafeScalar(value: unknown): string | undefined {
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value)
  }

  return undefined
}

function toSafeError(error: unknown, depth = 0): SafeError | null {
  if (depth >= 3 || typeof error !== 'object' || error === null) {
    return null
  }

  const record = error as Record<string, unknown>
  const nestedErrors = Array.isArray(record.errors)
    ? record.errors
        .slice(0, 3)
        .map((nestedError) => toSafeError(nestedError, depth + 1))
        .filter((nestedError): nestedError is SafeError => nestedError !== null)
    : undefined

  return {
    name: toSafeScalar(record.name),
    code: toSafeScalar(record.code),
    errno: toSafeScalar(record.errno),
    syscall: toSafeScalar(record.syscall),
    cause: toSafeError(record.cause, depth + 1),
    errors: nestedErrors,
  }
}

export const dynamic = 'force-dynamic'

export async function GET() {
  const databaseUrl = process.env.DATABASE_URL ?? ''
  const configuredPoolMode = process.env.PAYLOAD_DATABASE_POOL_MODE
  const poolMode = resolveDatabasePoolMode(configuredPoolMode, process.env.SITE_ID)
  const pool = getDatabasePoolConfig(databaseUrl, poolMode)
  let originalPort: string | null = null
  let resolvedPort: string | null = null
  let supabasePooler = false

  try {
    const original = new URL(databaseUrl)
    const resolved = new URL(pool.connectionString)
    originalPort = original.port || null
    resolvedPort = resolved.port || null
    supabasePooler = original.hostname.endsWith('.pooler.supabase.com')
  } catch {
    // Intentionally keep diagnostics limited to non-secret connection metadata.
  }

  const runtime = {
    databaseConfigured: databaseUrl.length > 0,
    payloadSecretConfigured: Boolean(process.env.PAYLOAD_SECRET),
    netlifyRuntime: Boolean(process.env.SITE_ID),
    configuredPoolMode: configuredPoolMode ?? null,
    poolMode: poolMode ?? null,
    supabasePooler,
    originalPort,
    resolvedPort,
    poolMax: pool.max ?? null,
  }

  try {
    const payload = await getPayload({ config })
    await payload.find({ collection: 'works', limit: 1 })

    return Response.json({ ok: true, runtime })
  } catch (error) {
    return Response.json(
      {
        ok: false,
        runtime,
        error: toSafeError(error),
      },
      { status: 503 },
    )
  }
}
