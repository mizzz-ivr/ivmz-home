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

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const [{ getPayload }, { default: config }] = await Promise.all([
      import('payload'),
      import('@payload-config'),
    ])
    const payload = await getPayload({ config })

    await payload.find({
      collection: 'users',
      limit: 1,
      overrideAccess: true,
      pagination: false,
    })

    return Response.json({ ok: true })
  } catch (error) {
    const details = collectSafeErrorDetails(error)
    const uniqueCodes = [...new Set(details.codes)]
    const uniqueNames = [...new Set(details.names)]
    const combinedMessage = details.messages.join('\n')
    const category =
      uniqueCodes.map((code) => knownCategories[code]).find(Boolean) ??
      (combinedMessage.includes('password authentication failed') ? 'authentication' : null) ??
      (combinedMessage.includes('tenant or user not found') ? 'pooler-user' : null) ??
      (combinedMessage.includes('sasl') ? 'sasl' : null) ??
      (combinedMessage.includes('certificate') ? 'tls' : null) ??
      (combinedMessage.includes('prepared statement') ? 'prepared-statement' : null) ??
      'unknown'

    return Response.json(
      {
        ok: false,
        category,
        codes: uniqueCodes,
        names: uniqueNames,
        signals: {
          passwordAuthenticationFailed: combinedMessage.includes('password authentication failed'),
          poolerUserNotFound: combinedMessage.includes('tenant or user not found'),
          saslFailure: combinedMessage.includes('sasl'),
          tlsFailure: combinedMessage.includes('certificate'),
          preparedStatementFailure: combinedMessage.includes('prepared statement'),
        },
      },
      { status: 503 },
    )
  }
}
