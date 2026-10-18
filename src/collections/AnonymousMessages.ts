import { APIError, type CollectionConfig } from 'payload'

import { isAdminCollectionUser, isAuthenticated } from '@/access/is-authenticated'

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
    // Published records must be withdrawn through the audited endpoint before deletion.
    delete: ({ req }) => (isAdminCollectionUser({ req }) ? { isPublic: { equals: false } } : false),
  },
  hooks: {
    beforeChange: [
      ({ data, originalDoc }) => {
        if (
          originalDoc?.isPublic &&
          ((data?.reply !== undefined && data.reply !== originalDoc.reply) ||
            (data?.status !== undefined && data.status !== originalDoc.status))
        ) {
          throw new APIError(
            '公開中の返信と状態は編集できません。先に非公開へ切り替えてください。',
            409,
          )
        }
        return data
      },
    ],
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
      name: 'publicationActions',
      type: 'ui',
      admin: {
        components: {
          Field: '/components/admin/AnonymousPublicationActions#AnonymousPublicationActions',
        },
      },
    },
    {
      name: 'internalNote',
      type: 'textarea',
      maxLength: 4_000,
    },
  ],
}
