export const PAYLOAD_PRODUCTION_ORIGIN = 'https://ivmz.ivrm.jp'

const localOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000']

export type PayloadOriginEnvironment = {
  CONTEXT?: string
  DEPLOY_PRIME_URL?: string
  PAYLOAD_ALLOWED_ORIGINS?: string
  PAYLOAD_BUILD_CONTEXT?: string
  PAYLOAD_BUILD_ORIGIN?: string
}

function normalizeOrigin(value: string): string | undefined {
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

function configuredOrigins(value: string | undefined): string[] {
  if (!value) {
    return []
  }

  return [
    ...new Set(
      value
        .split(',')
        .map((origin) => normalizeOrigin(origin.trim()))
        .filter((origin): origin is string => Boolean(origin)),
    ),
  ]
}

function currentPayloadOriginEnvironment(): PayloadOriginEnvironment {
  return {
    CONTEXT: process.env.CONTEXT,
    DEPLOY_PRIME_URL: process.env.DEPLOY_PRIME_URL,
    PAYLOAD_ALLOWED_ORIGINS: process.env.PAYLOAD_ALLOWED_ORIGINS,
    PAYLOAD_BUILD_CONTEXT: process.env.PAYLOAD_BUILD_CONTEXT,
    PAYLOAD_BUILD_ORIGIN: process.env.PAYLOAD_BUILD_ORIGIN,
  }
}

export function resolvePayloadAllowedOrigins(
  env: PayloadOriginEnvironment = currentPayloadOriginEnvironment(),
): string[] {
  const context = env.PAYLOAD_BUILD_CONTEXT || env.CONTEXT

  if (context === 'production') {
    return [PAYLOAD_PRODUCTION_ORIGIN]
  }

  if (context === 'deploy-preview' || context === 'branch-deploy') {
    const deployOriginSource = env.PAYLOAD_BUILD_ORIGIN || env.DEPLOY_PRIME_URL
    const deployOrigin = deployOriginSource ? normalizeOrigin(deployOriginSource) : undefined

    if (deployOrigin) {
      return [deployOrigin]
    }

    const fallbackOrigins = configuredOrigins(env.PAYLOAD_ALLOWED_ORIGINS)
    return fallbackOrigins.length > 0 ? fallbackOrigins : [PAYLOAD_PRODUCTION_ORIGIN]
  }

  const explicitOrigins = configuredOrigins(env.PAYLOAD_ALLOWED_ORIGINS)
  return explicitOrigins.length > 0 ? explicitOrigins : [...localOrigins]
}
