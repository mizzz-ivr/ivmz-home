import config from '@payload-config'
import { getPayload } from 'payload'

const diagnosticCategoryByCode: Record<string, string> = {
  '28P01': 'authentication',
  '3D000': 'database',
  '42501': 'authorization',
  ECONNREFUSED: 'connection-refused',
  ENETUNREACH: 'network',
  ENOTFOUND: 'dns',
  ETIMEDOUT: 'timeout',
}

function findSafeErrorCode(error: unknown, depth = 0): string | null {
  if (depth > 3 || typeof error !== 'object' || error === null) return null

  const candidate = error as {
    cause?: unknown
    code?: unknown
    errors?: unknown[]
  }

  if (typeof candidate.code === 'string' && /^[A-Z0-9_]+$/.test(candidate.code)) {
    return candidate.code
  }

  const causeCode = findSafeErrorCode(candidate.cause, depth + 1)
  if (causeCode) return causeCode

  for (const nestedError of candidate.errors ?? []) {
    const nestedCode = findSafeErrorCode(nestedError, depth + 1)
    if (nestedCode) return nestedCode
  }

  return null
}

export async function GET() {
  try {
    const payload = await getPayload({ config })

    await payload.find({
      collection: 'users',
      limit: 1,
      overrideAccess: true,
      pagination: false,
    })

    return Response.json({ ok: true })
  } catch (error) {
    const code = findSafeErrorCode(error)

    return Response.json(
      {
        ok: false,
        category: code ? (diagnosticCategoryByCode[code] ?? 'database-or-runtime') : 'unknown',
        code: code ?? 'UNKNOWN',
      },
      { status: 503 },
    )
  }
}
