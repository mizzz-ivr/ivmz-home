import {
  DEFAULT_ALLOWED_TYPE_IDS,
  DEFAULT_LIMITS,
  HARD_LIMITS,
  attachmentCatalog,
  type AttachmentTypeDefinition,
} from './catalog'

const MB = 1024 * 1024

/** Shape of the `contact-settings` global (all optional: a fresh install has nothing saved). */
export type ContactSettingsInput = {
  attachmentsEnabled?: boolean | null
  maxFileSizeMB?: number | null
  maxFiles?: number | null
  maxTotalSizeMB?: number | null
  allowedTypes?: readonly string[] | null
}

export type AttachmentPolicy = {
  enabled: boolean
  maxFileBytes: number
  maxFiles: number
  maxTotalBytes: number
  types: readonly AttachmentTypeDefinition[]
}

export const DISABLED_POLICY: AttachmentPolicy = {
  enabled: false,
  maxFileBytes: DEFAULT_LIMITS.maxFileBytes,
  maxFiles: DEFAULT_LIMITS.maxFiles,
  maxTotalBytes: DEFAULT_LIMITS.maxTotalBytes,
  types: [],
}

function clampInteger(value: unknown, fallback: number, min: number, max: number): number {
  const number = typeof value === 'number' && Number.isFinite(value) ? Math.floor(value) : fallback
  return Math.min(max, Math.max(min, number))
}

/**
 * Turns CMS settings into the policy the server enforces. CMS values can only narrow what the code
 * allows: sizes are clamped to the hard ceilings and types are intersected with the vetted catalog.
 * Attachments stay off unless storage + malware scanning are configured AND an admin enabled them.
 */
export function resolveAttachmentPolicy(
  settings: ContactSettingsInput | null | undefined,
  options: { storageConfigured: boolean },
): AttachmentPolicy {
  if (!options.storageConfigured || !settings?.attachmentsEnabled) return DISABLED_POLICY

  const requested = settings.allowedTypes ?? DEFAULT_ALLOWED_TYPE_IDS
  const types = attachmentCatalog.filter((type) =>
    (requested as readonly string[]).includes(type.id),
  )
  if (types.length === 0) return DISABLED_POLICY

  const maxFileBytes =
    clampInteger(
      settings.maxFileSizeMB,
      DEFAULT_LIMITS.maxFileBytes / MB,
      1,
      HARD_LIMITS.maxFileBytes / MB,
    ) * MB
  const maxFiles = clampInteger(settings.maxFiles, DEFAULT_LIMITS.maxFiles, 1, HARD_LIMITS.maxFiles)
  const maxTotalBytes = Math.max(
    maxFileBytes,
    clampInteger(
      settings.maxTotalSizeMB,
      DEFAULT_LIMITS.maxTotalBytes / MB,
      1,
      HARD_LIMITS.maxTotalBytes / MB,
    ) * MB,
  )

  return { enabled: true, maxFileBytes, maxFiles, maxTotalBytes, types }
}

/** What the browser needs to render the picker and pre-check files (server re-checks everything). */
export function toPublicPolicy(policy: AttachmentPolicy) {
  return {
    enabled: policy.enabled,
    maxFileBytes: policy.maxFileBytes,
    maxFiles: policy.maxFiles,
    maxTotalBytes: policy.maxTotalBytes,
    types: policy.types.map((type) => ({
      id: type.id,
      label: type.label,
      extensions: type.extensions,
      mime: type.mime,
    })),
  }
}

export type PublicAttachmentPolicy = ReturnType<typeof toPublicPolicy>
