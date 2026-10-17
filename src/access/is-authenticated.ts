import type { Access } from 'payload'

/**
 * A token from another authentication-enabled collection must not grant CMS inbox access.
 * Respect the configured Admin user collection rather than merely checking for a login.
 */
export const isAuthenticated: Access = ({ req }) =>
  Boolean(req.user && req.user.collection === req.payload.config.admin.user)
