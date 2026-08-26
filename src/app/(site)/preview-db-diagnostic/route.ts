type SafeErrorDetails = {
  codes: string[]
  names: string[]
  messages: string[]
}

const knownCategories: Record<string, string> = {
  '28P01': 'authentication',
  '3D000': 'database',
  '42501': 'authorization',
  ECONNREFUSED: 'connection-refused',
  ECONNRESET: 'connection-reset',
  ENETUNREACH: 'network',
  ENOTFOUND: 'dns',
  ETIMEDOUT: 'timeout',
}

function collectSafeErrorDetails(
  error: unknown,
  details: SafeErrorDetails = { codes: [], names: [], messages: [] },
  depth = 0,
): SafeErrorDetails {
  if (depth > 4 || typeof error !== 'object' || error === null) return details

  const candidate = error as {
    cause?: unknown
    code?: unknown
    errors?: unknown[]
    message?: unknown
    name?: unknown
  }

  if (typeof candidate.code === 'string' && /^[A-Z0-9_]+$/.test(candidate.code)) {
    details.codes.push(candidate.code)
  }

  if (typeof candidate.name === 'string' && /^[A-Za-z0-9_.-]+$/.test(candidate.name)) {
    details.names.push(candidate.name)
  }

  if (typeof candidate.message === 'string') {
    details.messages.push(candidate.message.toLowerCase())
  }

  collectSafeErrorDetails(candidate.cause, details, depth + 1)

  for (const nestedError of candidate.errors ?? []) {
    collectSafeErrorDetails(nestedError, details, depth + 1)
  }

  return details
}

function diagnosticResponse(error: unknown, stage: string) {
  const details = collectSafeErrorDetails(error)
  const uniqueCodes = [...new Set(details.codes)]
  const uniqueNames = [...new Set(details.names)]
  const message = details.messages.join('\n')
  const category =
    uniqueCodes.map((code) => knownCategories[code]).find(Boolean) ??
    (message.includes('password authentication failed') ? 'authentication' : null) ??
    (message.includes('tenant or user not found') ? 'pooler-user' : null) ??
    (message.includes('invalid connection') || message.includes('invalid url')
      ? 'connection-string'
      : null) ??
    (message.includes('sasl') ? 'sasl' : null) ??
    (message.includes('certificate') || message.includes('ssl') ? 'tls' : null) ??
    (message.includes('prepared statement') ? 'prepared-statement' : null) ??
    (message.includes('permission denied') ? 'authorization' : null) ??
    (message.includes('schema') || message.includes('relation') ? 'schema' : null) ??
    (message.includes('cannot find module') ? 'module-resolution' : null) ??
    (message.includes('database') || message.includes('postgres') ? 'database-or-driver' : null) ??
    'unknown'

  return Response.json(
    {
      ok: false,
      stage,
      category,
      codes: uniqueCodes,
      names: uniqueNames,
      signals: {
        mentionsAuthentication: message.includes('authentication'),
        mentionsConnection: message.includes('connect'),
        mentionsDatabase: message.includes('database') || message.includes('postgres'),
        mentionsHost: message.includes('host'),
        mentionsModule: message.includes('module'),
        mentionsPassword: message.includes('password'),
        mentionsPermission: message.includes('permission'),
        mentionsPooler: message.includes('pooler') || message.includes('tenant'),
        mentionsSchema: message.includes('schema') || message.includes('relation'),
        mentionsSsl: message.includes('ssl') || message.includes('certificate'),
        mentionsTimeout: message.includes('timeout') || message.includes('timed out'),
        mentionsUrl: message.includes('url') || message.includes('connection string'),
      },
    },
    { status: 503 },
  )
}

export const dynamic = 'force-dynamic'

export async function GET() {
  let getPayload: typeof import('payload')['getPayload']
  let config: Awaited<ReturnType<typeof import('@payload-config')['default']>>

  try {
    const payloadModule = await import('payload')
    getPayload = payloadModule.getPayload
  } catch (error) {
    return diagnosticResponse(error, 'payload-module-import')
  }

  try {
    const configModule = await import('@payload-config')
    config = await configModule.default
  } catch (error) {
    return diagnosticResponse(error, 'payload-config-import')
  }

  let payload: Awaited<ReturnType<typeof getPayload>>

  try {
    payload = await getPayload({ config })
  } catch (error) {
    return diagnosticResponse(error, 'payload-init')
  }

  try {
    await payload.find({
      collection: 'users',
      limit: 1,
      overrideAccess: true,
      pagination: false,
    })
  } catch (error) {
    return diagnosticResponse(error, 'payload-query')
  }

  return Response.json({ ok: true })
}
