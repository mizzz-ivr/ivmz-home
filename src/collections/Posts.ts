import type { CollectionConfig } from 'payload'

import {
  contentMutationAccess,
  contentVersionAccess,
  publishedOrAuthenticated,
} from '@/content/access'
import {
  createSlugField,
  validateOptionalHttpUrl,
} from '@/content/fields'
import { setPublishedAtOnPublish } from '@/content/hooks'

export const Posts: CollectionConfig = {
  slug: 'posts',
  admin: {
    defaultColumns: ['title', 'category', 'publishedAt', 'updatedAt'],
    group: 'Content',
    useAsTitle: 'title',
  },
  access: {
    create: contentMutationAccess,
    delete: contentMutationAccess,
    read: publishedOrAuthenticated,
    readVersions: contentVersionAccess,
    update: contentMutationAccess,
  },
  hooks: {
    beforeChange: [setPublishedAtOnPublish],
  },
  versions: {
    drafts: true,
  },
  fields: [
    {
      type: 'group',
      label: 'Article',
      fields: [
        {
          name: 'title',
          type: 'text',
          index: true,
          maxLength: 180,
          required: true,
        },
        createSlugField(),
        {
          name: 'excerpt',
          type: 'textarea',
          maxLength: 500,
          required: true,
        },
        {
          name: 'body',
          type: 'textarea',
          maxLength: 10_000,
          required: true,
          admin: {
            description:
              'Markdown/plain-text content baseline. Rich-text editor adoption is intentionally deferred.',
          },
        },
      ],
    },
    {
      type: 'group',
      label: 'Taxonomy',
      fields: [
        {
          name: 'category',
          type: 'text',
          index: true,
          maxLength: 80,
          required: true,
        },
        {
          name: 'tags',
          type: 'text',
          hasMany: true,
          maxLength: 80,
          maxRows: 20,
        },
      ],
    },
    {
      type: 'group',
      label: 'Publishing & relationships',
      fields: [
        {
          name: 'cover',
          type: 'upload',
          relationTo: 'media',
          maxDepth: 0,
        },
        {
          name: 'canonicalUrl',
          type: 'text',
          label: 'Canonical URL',
          validate: validateOptionalHttpUrl,
        },
        {
          name: 'relatedWorks',
          type: 'relationship',
          relationTo: 'works',
          hasMany: true,
          maxRows: 12,
        },
      ],
    },
    {
      name: 'publishedAt',
      type: 'date',
      index: true,
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
        position: 'sidebar',
      },
    },
  ],
}
