import type { CollectionConfig } from 'payload'

import { isAuthenticated } from '@/access/is-authenticated'
import { contactCategories } from '@/contact/schema'

const submittedFieldAdmin = { readOnly: true } as const
/** Submitted content is immutable through the Admin UI, REST and Local API (server uses overrideAccess). */
const submittedFieldAccess = { create: () => false, update: () => false }

/**
 * Inbox for /contact. Records are created only by the server route through the Local API
 * (overrideAccess), never through the public REST API; only authenticated users can read or triage.
 */
export const ContactSubmissions: CollectionConfig = {
  slug: 'contact-submissions',
  admin: {
    defaultColumns: ['subject', 'name', 'category', 'status', 'createdAt'],
    group: 'Inbox',
    useAsTitle: 'subject',
  },
  access: {
    create: () => false,
    delete: isAuthenticated,
    read: isAuthenticated,
    update: isAuthenticated,
  },
  fields: [
    {
      name: 'status',
      type: 'select',
      defaultValue: 'new',
      index: true,
      options: [
        { label: 'New', value: 'new' },
        { label: 'Read', value: 'read' },
        { label: 'Replied', value: 'replied' },
        { label: 'Archived', value: 'archived' },
        { label: 'Spam', value: 'spam' },
      ],
      required: true,
    },
    {
      name: 'subject',
      type: 'text',
      access: submittedFieldAccess,
      admin: submittedFieldAdmin,
      maxLength: 160,
      required: true,
    },
    {
      name: 'name',
      type: 'text',
      access: submittedFieldAccess,
      admin: submittedFieldAdmin,
      maxLength: 80,
      required: true,
    },
    {
      name: 'email',
      type: 'text',
      access: submittedFieldAccess,
      admin: submittedFieldAdmin,
      maxLength: 254,
      required: true,
    },
    {
      name: 'category',
      type: 'select',
      access: submittedFieldAccess,
      admin: submittedFieldAdmin,
      index: true,
      options: contactCategories.map((value) => ({ label: value, value })),
      required: true,
    },
    {
      name: 'message',
      type: 'textarea',
      access: submittedFieldAccess,
      admin: submittedFieldAdmin,
      maxLength: 8_000,
      required: true,
    },
    {
      name: 'recipient',
      type: 'text',
      access: submittedFieldAccess,
      admin: { ...submittedFieldAdmin, description: 'Server-side routed destination mailbox.' },
      required: true,
    },
    {
      name: 'requestId',
      type: 'text',
      access: submittedFieldAccess,
      admin: submittedFieldAdmin,
      index: true,
      required: true,
      unique: true,
    },
    {
      name: 'attachments',
      type: 'array',
      access: submittedFieldAccess,
      admin: {
        description:
          'Files that passed the malware scan and content checks. Stored privately; open them with the download path (admin login required).',
        readOnly: true,
      },
      fields: [
        { name: 'filename', type: 'text', required: true, maxLength: 160 },
        { name: 'key', type: 'text', required: true },
        { name: 'size', type: 'number', required: true },
        { name: 'contentType', type: 'text', required: true },
        { name: 'sha256', type: 'text', required: true },
        {
          name: 'downloadPath',
          type: 'text',
          admin: {
            description: 'Admin-only download link (short-lived redirect).',
            readOnly: true,
          },
          hooks: {
            afterRead: [
              ({ siblingData }) =>
                siblingData?.id
                  ? `/api/contact/attachments/download?row=${encodeURIComponent(String(siblingData.id))}`
                  : undefined,
            ],
          },
          virtual: true,
        },
      ],
    },
    {
      name: 'notification',
      type: 'select',
      access: submittedFieldAccess,
      admin: {
        description:
          'Email notification state (server-owned). The submission is stored regardless.',
        readOnly: true,
      },
      defaultValue: 'pending',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Sent', value: 'sent' },
        { label: 'Failed', value: 'failed' },
        { label: 'Unknown (timed out; check the mailbox)', value: 'unknown' },
        { label: 'Skipped (not configured)', value: 'skipped' },
      ],
      required: true,
    },
    {
      name: 'notificationError',
      type: 'text',
      access: submittedFieldAccess,
      admin: { readOnly: true },
      maxLength: 120,
    },
    {
      name: 'internalNote',
      type: 'textarea',
      admin: { description: 'Private triage note. Never shown publicly.' },
      maxLength: 4_000,
    },
  ],
}
