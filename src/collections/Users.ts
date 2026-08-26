import type { CollectionConfig } from 'payload'

import { isAuthenticated } from '@/access/is-authenticated'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
  },
  access: {
    admin: isAuthenticated,
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
    },
  ],
}
