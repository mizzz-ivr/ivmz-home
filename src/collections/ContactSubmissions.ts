import {
  APIError,
  type Access,
  type CollectionBeforeDeleteHook,
  type CollectionConfig,
} from 'payload'

import { isAdminCollectionUser, isAuthenticated } from '@/access/is-authenticated'
import { contactCategories } from '@/contact/schema'

const submittedFieldAdmin = { readOnly: true } as const
/** Submitted content is immutable through the Admin UI, REST and Local API (server uses overrideAccess). */
const submittedFieldAccess = { create: () => false, update: () => false }

/**
 * Only inbox records without S3 references may be removed through normal CMS permissions.
 * Other users must not infer whether an attachment exists.
 */
export const canDeleteContactSubmission: Access = ({ req }) => {
  if (!isAdminCollectionUser({ req })) return false
  return { 'attachments.id': { exists: false } }
}

/**
 * Defense in depth for server-side Local API calls using overrideAccess.
 * Never remove a DB reference before S3 cleanup/retry/restore is implemented.
 */
export const preventAttachedSubmissionDeletion: CollectionBeforeDeleteHook = async ({
  id,
  req,
}) => {
  const submission = await req.payload.findByID({
    collection: 'contact-submissions',
    depth: 0,
    id,
    overrideAccess: true,
    req,
    select: { attachments: true },
  })

  if (
    submission.attachments != null &&
    (!Array.isArray(submission.attachments) || submission.attachments.length > 0)
  ) {
    throw new APIError('添付ファイル付きの問い合わせは、安全な削除手順が整うまで削除できません。', 409)
  }
}

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
    delete: canDeleteContactSubmission,
    read: isAuthenticated,
    update: isAuthenticated,
  },
  hooks: { beforeDelete: [preventAttachedSubmissionDeletion] },
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
          'Files that passed malware and content checks. Download requires admin login. Submissions with attachments cannot be deleted until safe storage cleanup is implemented.',
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
      // Rendered outside the array on purpose: custom `Field` components nested in array rows are not
      // honoured by the pinned Payload version. It lists one download link per stored attachment.
      name: 'attachmentDownloads',
      type: 'ui',
      admin: {
        components: {
          Field: '/components/admin/AttachmentDownloads#AttachmentDownloads',
        },
      },
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
