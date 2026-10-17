import type { Access, PayloadRequest } from 'payload'

/**
 * A token from another authentication-enabled collection must not grant CMS inbox access.
 * Respect the configured Admin user collection rather than merely checking for a login.
 */
export function isAdminCollectionUser({ req }: { req: PayloadRequest }): boolean {
  return Boolean(req.user && req.user.collection === req.payload.config.admin.user)
}

export const isAuthenticated: Access = isAdminCollectionUser
