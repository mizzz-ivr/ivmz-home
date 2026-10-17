import type { CollectionConfig } from 'payload'

import { isAdminCollectionUser, isAuthenticated } from '@/access/is-authenticated'
import { isPayloadUnauthorizedError } from '@/security/payload-authorization'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
  },
  access: {
    admin: isAdminCollectionUser,
    unlock: isAuthenticated,
  },
  auth: {
    cookies: {
      sameSite: 'Lax',
      secure: process.env.NODE_ENV === 'production',
    },
    lockTime: 15 * 60 * 1000,
    maxLoginAttempts: 5,
    removeTokenFromResponses: true,
    tokenExpiration: 2 * 60 * 60,
    useAPIKey: false,
  },
  fields: [
    {
      name: 'password',
      type: 'text',
      hidden: true,
      minLength: 14,
      virtual: true,
    },
  ],
  hooks: {
    afterError: [
      ({ error, req, result }) => {
        if (!req.user && isPayloadUnauthorizedError(error)) {
          return {
            response: result,
            status: 401,
          }
        }
      },
    ],
  },
}
