type RuntimeEnvironment = {
  CONTEXT?: string | undefined
  PAYLOAD_BUILD_CONTEXT?: string | undefined
}

/** True only on the production deploy (not Deploy Previews, branch deploys or local runs). */
export function isProductionRuntime(
  env: RuntimeEnvironment = {
    CONTEXT: process.env.CONTEXT,
    PAYLOAD_BUILD_CONTEXT: process.env.PAYLOAD_BUILD_CONTEXT,
  },
): boolean {
  return (env.PAYLOAD_BUILD_CONTEXT || env.CONTEXT) === 'production'
}
