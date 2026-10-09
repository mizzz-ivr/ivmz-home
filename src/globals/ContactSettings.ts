import type { GlobalConfig } from 'payload'

import { isAuthenticated } from '@/access/is-authenticated'
import {
  DEFAULT_ALLOWED_TYPE_IDS,
  DEFAULT_LIMITS,
  HARD_LIMITS,
  attachmentCatalog,
} from '@/contact/attachments/catalog'

const MB = 1024 * 1024

/**
 * Admin-editable contact form settings. Everything here can only NARROW what the code allows:
 * sizes are clamped to hard ceilings and types come from a vetted catalog (no executables,
 * archives or macro-enabled documents can be enabled from the CMS).
 */
export const ContactSettings: GlobalConfig = {
  slug: 'contact-settings',
  label: 'Contact settings',
  admin: { group: 'Inbox' },
  access: {
    // The public form reads these through the server (/api/contact/attachments/policy) only.
    read: isAuthenticated,
    update: isAuthenticated,
  },
  fields: [
    {
      name: 'attachmentsEnabled',
      type: 'checkbox',
      label: 'Allow file attachments',
      defaultValue: false,
      admin: {
        description:
          'Off by default. Files are uploaded to a private quarantine bucket, scanned by AWS GuardDuty Malware Protection for S3, then content-checked before they can be attached. Has no effect until the storage environment variables are configured.',
      },
    },
    {
      name: 'maxFileSizeMB',
      type: 'number',
      label: 'Max size per file (MB)',
      defaultValue: DEFAULT_LIMITS.maxFileBytes / MB,
      min: 1,
      max: HARD_LIMITS.maxFileBytes / MB,
      admin: {
        description: `1–${HARD_LIMITS.maxFileBytes / MB} MB. Higher values are clamped by the server.`,
      },
    },
    {
      name: 'maxFiles',
      type: 'number',
      label: 'Max number of files',
      defaultValue: DEFAULT_LIMITS.maxFiles,
      min: 1,
      max: HARD_LIMITS.maxFiles,
      admin: { description: `1–${HARD_LIMITS.maxFiles}.` },
    },
    {
      name: 'maxTotalSizeMB',
      type: 'number',
      label: 'Max total size (MB)',
      defaultValue: DEFAULT_LIMITS.maxTotalBytes / MB,
      min: 1,
      max: HARD_LIMITS.maxTotalBytes / MB,
      admin: {
        description: `1–${HARD_LIMITS.maxTotalBytes / MB} MB across all files in one message.`,
      },
    },
    {
      name: 'allowedTypes',
      type: 'select',
      hasMany: true,
      label: 'Allowed file types',
      defaultValue: [...DEFAULT_ALLOWED_TYPE_IDS],
      options: attachmentCatalog.map((type) => ({ label: type.label, value: type.id })),
      admin: {
        description:
          'Choose from the vetted list only. Office files are accepted without macros, embedded objects or external templates. Images are re-encoded to strip metadata; PDFs with scripts or launch actions are rejected.',
      },
    },
  ],
}
