export type DatabasePoolMode = 'session' | 'transaction'

const SUPABASE_POOLER_HOST_SUFFIX = '.pooler.supabase.com'
const SUPABASE_SESSION_PORT = '5432'
const SUPABASE_TRANSACTION_PORT = '6543'

export function resolveDatabasePoolMode(
  configuredMode: string | undefined,
  netlifyFunctionName: string | undefined,
): DatabasePoolMode | undefined {
  if (configuredMode === 'session' || configuredMode === 'transaction') {
    return configuredMode
  }

  return netlifyFunctionName ? 'transaction' : undefined
}

export function resolveDatabaseConnectionString(
  databaseUrl: string,
  poolMode: string | undefined,
): string {
  if (poolMode !== 'transaction') {
    return databaseUrl
  }

  try {
    const url = new URL(databaseUrl)

    if (!url.hostname.endsWith(SUPABASE_POOLER_HOST_SUFFIX) || url.port !== SUPABASE_SESSION_PORT) {
      return databaseUrl
    }

    url.port = SUPABASE_TRANSACTION_PORT
    return url.toString()
  } catch {
    return databaseUrl
  }
}

export function getDatabasePoolConfig(
  databaseUrl: string,
  poolMode: string | undefined,
): {
  connectionString: string
  max?: number
} {
  const connectionString = resolveDatabaseConnectionString(databaseUrl, poolMode)

  if (poolMode === 'transaction' && connectionString !== databaseUrl) {
    return {
      connectionString,
      max: 1,
    }
  }

  return { connectionString }
}
