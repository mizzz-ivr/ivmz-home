import { PAYLOAD_PRODUCTION_ORIGIN } from './payload-origins'

const localOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000']

export type ContactOriginEnvironment = {
  CONTEXT?: string
  DEPLOY_PRIME_URL?: string
  PAYLOAD_BUILD_CONTEXT?: string
  PAYLOAD_BUILD_ORIGIN?: string
}

function normalizeOrigin(value: string | undefined): string | undefined {
  if (!value) return undefined

  try {
    const url = new URL(value)

    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
      return undefined
    }

    return url.origin
  } catch {
    return undefined
  }
}

function currentEnvironment(): ContactOriginEnvironment {
  return {
    CONTEXT: process.env.CONTEXT,
    DEPLOY_PRIME_URL: process.env.DEPLOY_PRIME_URL,
    PAYLOAD_BUILD_CONTEXT: process.env.PAYLOAD_BUILD_CONTEXT,
    PAYLOAD_BUILD_ORIGIN: process.env.PAYLOAD_BUILD_ORIGIN,
  }
}

export function resolveContactAllowedOrigins(
  env: ContactOriginEnvironment = currentEnvironment(),
): string[] {
  const context = env.PAYLOAD_BUILD_CONTEXT || env.CONTEXT

  if (context === 'production') {
    return [PAYLOAD_PRODUCTION_ORIGIN]
  }

  if (context === 'deploy-preview' || context === 'branch-deploy') {
    const previewOrigin = normalizeOrigin(env.PAYLOAD_BUILD_ORIGIN || env.DEPLOY_PRIME_URL)
    return previewOrigin ? [previewOrigin] : []
  }

  return [...localOrigins]
}

export function isAllowedContactOrigin(
  origin: string | null,
  env: ContactOriginEnvironment = currentEnvironment(),
) {
  const normalized = normalizeOrigin(origin ?? undefined)
  return Boolean(normalized && resolveContactAllowedOrigins(env).includes(normalized))
}
