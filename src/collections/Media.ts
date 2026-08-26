import type { Access, CollectionConfig } from 'payload'

import { isAuthenticated } from '@/access/is-authenticated'

const canManageLocalMedia: Access = ({ req: { user } }) =>
  Boolean(user) && process.env.NODE_ENV !== 'production'

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    create: canManageLocalMedia,
    delete: canManageLocalMedia,
    read: isAuthenticated,
    update: canManageLocalMedia,
  },
  admin: {
    useAsTitle: 'filename',
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      maxLength: 240,
      required: true,
    },
  ],
  upload: {
    disableLocalStorage: process.env.NODE_ENV === 'production',
    filesRequiredOnCreate: true,
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'],
    staticDir: 'media',
  },
}
