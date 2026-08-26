import type { CollectionConfig } from 'payload'

import {
  contentMutationAccess,
  enabledSocialOrAuthenticated,
} from '@/content/access'
import { validateRequiredHttpUrl } from '@/content/fields'

export const SocialLinks: CollectionConfig = {
  slug: 'social-links',
  admin: {
    defaultColumns: ['platform', 'handle', 'enabled', 'order'],
    group: 'Content',
    useAsTitle: 'platform',
  },
  access: {
    create: contentMutationAccess,
    delete: contentMutationAccess,
    read: enabledSocialOrAuthenticated,
    update: contentMutationAccess,
  },
  fields: [
    {
      name: 'platform',
      type: 'text',
      index: true,
      maxLength: 80,
      required: true,
    },
    {
      name: 'url',
      type: 'text',
      label: 'URL',
      required: true,
      validate: validateRequiredHttpUrl,
    },
    {
      name: 'handle',
      type: 'text',
      maxLength: 160,
    },
    {
      name: 'enabled',
      type: 'checkbox',
      defaultValue: true,
      required: true,
    },
    {
      name: 'order',
      type: 'number',
      defaultValue: 100,
      index: true,
      min: 0,
      required: true,
    },
  ],
}
