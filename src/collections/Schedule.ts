import type { CollectionConfig } from 'payload'

import { contentMutationAccess, publicScheduleOrAuthenticated } from '@/content/access'
import {
  validateIanaTimezone,
  validateOptionalHttpUrl,
  validateScheduleEndAt,
} from '@/content/fields'

function getScheduleStartAt(siblingData: unknown): unknown {
  if (siblingData === null || typeof siblingData !== 'object') return undefined
  return 'startAt' in siblingData ? (siblingData as Record<string, unknown>).startAt : undefined
}

export const Schedule: CollectionConfig = {
  slug: 'schedule',
  admin: {
    defaultColumns: ['title', 'type', 'startAt', 'visibility'],
    group: 'Content',
    useAsTitle: 'title',
  },
  access: {
    create: contentMutationAccess,
    delete: contentMutationAccess,
    read: publicScheduleOrAuthenticated,
    update: contentMutationAccess,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      maxLength: 180,
      required: true,
    },
    {
      name: 'type',
      type: 'select',
      index: true,
      options: [
        { label: 'Event', value: 'event' },
        { label: 'Release', value: 'release' },
        { label: 'Meetup', value: 'meetup' },
        { label: 'Stream', value: 'stream' },
        { label: 'Publication', value: 'publication' },
        { label: 'Availability', value: 'availability' },
      ],
      required: true,
    },
    {
      type: 'group',
      label: 'Timing',
      fields: [
        {
          name: 'startAt',
          type: 'date',
          index: true,
          required: true,
          admin: {
            date: {
              pickerAppearance: 'dayAndTime',
            },
          },
        },
        {
          name: 'endAt',
          type: 'date',
          validate: (value, { siblingData }) =>
            validateScheduleEndAt(value, getScheduleStartAt(siblingData)),
          admin: {
            date: {
              pickerAppearance: 'dayAndTime',
            },
          },
        },
        {
          name: 'timezone',
          type: 'text',
          defaultValue: 'Asia/Tokyo',
          maxLength: 80,
          required: true,
          validate: validateIanaTimezone,
          admin: {
            description: 'IANA timezone used to preserve the intended public display context.',
          },
        },
      ],
    },
    {
      name: 'visibility',
      type: 'select',
      defaultValue: 'private',
      index: true,
      options: [
        { label: 'Public', value: 'public' },
        { label: 'Private', value: 'private' },
      ],
      required: true,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'location',
      type: 'text',
      maxLength: 240,
    },
    {
      name: 'url',
      type: 'text',
      label: 'URL',
      validate: validateOptionalHttpUrl,
    },
    {
      name: 'description',
      type: 'textarea',
      maxLength: 2_000,
    },
  ],
}
