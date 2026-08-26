import type { CollectionConfig } from 'payload'

import {
  contentMutationAccess,
  contentVersionAccess,
  publishedOrAuthenticated,
} from '@/content/access'
import { createSlugField, validateOptionalHttpUrl } from '@/content/fields'
import { setPublishedAtOnPublish } from '@/content/hooks'

export const News: CollectionConfig = {
  slug: 'news',
  admin: {
    defaultColumns: ['title', 'type', 'publishedAt', 'updatedAt'],
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
      name: 'title',
      type: 'text',
      index: true,
      maxLength: 180,
      required: true,
    },
    createSlugField(),
    {
      name: 'body',
      type: 'textarea',
      maxLength: 10_000,
      required: true,
    },
    {
      name: 'type',
      type: 'select',
      index: true,
      options: [
        { label: 'Release', value: 'release' },
        { label: 'Announcement', value: 'announcement' },
        { label: 'Event', value: 'event' },
        { label: 'Publication', value: 'publication' },
        { label: 'Activity', value: 'activity' },
      ],
      required: true,
    },
    {
      name: 'externalUrl',
      type: 'text',
      label: 'External URL',
      validate: validateOptionalHttpUrl,
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
