import type { CollectionConfig } from 'payload'

import { isAuthenticated } from '@/access/is-authenticated'

const serverOwned = { create: () => false, update: () => false }
const readOnly = { readOnly: true } as const

/**
 * Private inbox. No public REST mutations or reads.
 * Only the future trusted submit route can create through the server-side Local API
 * with overrideAccess. Publication fields are reserved for a separate audited action.
 */
export const AnonymousMessages: CollectionConfig = {
  slug: 'anonymous-messages',
  admin: {
    defaultColumns: ['status', 'message', 'isPublic', 'createdAt'],
    group: 'Inbox',
    useAsTitle: 'message',
  },
  access: {
    create: () => false,
    read: isAuthenticated,
    update: isAuthenticated,
    delete: isAuthenticated,
  },
  fields: [
    {
      name: 'status',
      type: 'select',
      required: true,
      index: true,
      defaultValue: 'new',
      options: [
        { label: 'New', value: 'new' },
        { label: 'Read', value: 'read' },
        { label: 'Replied', value: 'replied' },
        { label: 'Hidden', value: 'hidden' },
        { label: 'Spam', value: 'spam' },
      ],
    },
    {
      name: 'message',
      type: 'textarea',
      required: true,
      access: serverOwned,
      admin: readOnly,
    },
    {
      name: 'requestId',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      access: serverOwned,
      admin: { ...readOnly, hidden: true },
    },
    {
      name: 'reply',
      type: 'textarea',
      maxLength: 2_000,
    },
    {
      name: 'isPublic',
      type: 'checkbox',
      required: true,
      defaultValue: false,
      index: true,
      access: serverOwned,
      admin: readOnly,
    },
    {
      name: 'publicId',
      type: 'text',
      unique: true,
      index: true,
      access: serverOwned,
      admin: readOnly,
    },
    {
      name: 'publishedAt',
      type: 'date',
      index: true,
      access: serverOwned,
      admin: { ...readOnly, date: { pickerAppearance: 'dayAndTime' } },
    },
    {
      name: 'internalNote',
      type: 'textarea',
      maxLength: 4_000,
    },
  ],
}
