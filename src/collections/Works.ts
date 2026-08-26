import type { CollectionConfig } from 'payload'

import {
  contentMutationAccess,
  contentVersionAccess,
  publishedOrAuthenticated,
} from '@/content/access'
import { createSlugField, validateOptionalHttpUrl } from '@/content/fields'
import { setPublishedAtOnPublish } from '@/content/hooks'

export const Works: CollectionConfig = {
  slug: 'works',
  admin: {
    defaultColumns: ['title', 'projectStatus', 'publishedAt', 'updatedAt'],
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
      label: 'Identity',
      fields: [
        {
          name: 'title',
          type: 'text',
          index: true,
          maxLength: 160,
          required: true,
        },
        createSlugField(),
        {
          name: 'summary',
          type: 'textarea',
          maxLength: 500,
          required: true,
        },
        {
          name: 'role',
          type: 'text',
          maxLength: 240,
          required: true,
        },
        {
          name: 'projectStatus',
          type: 'select',
          defaultValue: 'active',
          index: true,
          options: [
            { label: 'Active', value: 'active' },
            { label: 'Maintained', value: 'maintained' },
            { label: 'Completed', value: 'completed' },
            { label: 'Archived', value: 'archived' },
          ],
          required: true,
        },
      ],
    },
    {
      type: 'group',
      label: 'Technology & links',
      fields: [
        {
          name: 'stack',
          type: 'text',
          hasMany: true,
          maxRows: 24,
          minRows: 1,
          required: true,
        },
        {
          name: 'githubUrl',
          type: 'text',
          label: 'GitHub URL',
          validate: validateOptionalHttpUrl,
        },
        {
          name: 'liveUrl',
          type: 'text',
          label: 'Live URL',
          validate: validateOptionalHttpUrl,
        },
      ],
    },
    {
      type: 'group',
      label: 'Case study',
      fields: [
        {
          name: 'gallery',
          type: 'upload',
          relationTo: 'media',
          hasMany: true,
          maxDepth: 0,
          maxRows: 12,
        },
        {
          name: 'highlights',
          type: 'text',
          hasMany: true,
          maxLength: 500,
          maxRows: 12,
        },
        {
          name: 'caseStudy',
          type: 'textarea',
          label: 'Case study',
          maxLength: 10_000,
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
