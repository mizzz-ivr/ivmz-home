/**
 * Vetted attachment types. The CMS can only choose among these ids, and only within the hard
 * ceilings below, so an admin can never allow executables, archives or macro-enabled documents.
 */

export const HARD_LIMITS = {
  maxFileBytes: 20 * 1024 * 1024,
  maxFiles: 5,
  maxTotalBytes: 50 * 1024 * 1024,
} as const

export const DEFAULT_LIMITS = {
  maxFileBytes: 5 * 1024 * 1024,
  maxFiles: 3,
  maxTotalBytes: 15 * 1024 * 1024,
} as const

export const attachmentKinds = ['image', 'pdf', 'text', 'office'] as const
export type AttachmentKind = (typeof attachmentKinds)[number]

export type AttachmentTypeDefinition = {
  id: string
  label: string
  kind: AttachmentKind
  /** Lower-case extensions without the dot. The first one is canonical. */
  extensions: readonly string[]
  mime: string
  /** Only OOXML types: the part that must exist for the declared type to be genuine. */
  officeMainPart?: string
}

export const attachmentCatalog = [
  { id: 'png', label: 'PNG image', kind: 'image', extensions: ['png'], mime: 'image/png' },
  {
    id: 'jpeg',
    label: 'JPEG image',
    kind: 'image',
    extensions: ['jpg', 'jpeg'],
    mime: 'image/jpeg',
  },
  { id: 'webp', label: 'WebP image', kind: 'image', extensions: ['webp'], mime: 'image/webp' },
  { id: 'pdf', label: 'PDF document', kind: 'pdf', extensions: ['pdf'], mime: 'application/pdf' },
  { id: 'txt', label: 'Plain text', kind: 'text', extensions: ['txt'], mime: 'text/plain' },
  { id: 'md', label: 'Markdown', kind: 'text', extensions: ['md'], mime: 'text/markdown' },
  { id: 'csv', label: 'CSV', kind: 'text', extensions: ['csv'], mime: 'text/csv' },
  {
    id: 'docx',
    label: 'Word document (.docx, no macros)',
    kind: 'office',
    extensions: ['docx'],
    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    officeMainPart: 'word/document.xml',
  },
  {
    id: 'xlsx',
    label: 'Excel workbook (.xlsx, no macros)',
    kind: 'office',
    extensions: ['xlsx'],
    mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    officeMainPart: 'xl/workbook.xml',
  },
  {
    id: 'pptx',
    label: 'PowerPoint presentation (.pptx, no macros)',
    kind: 'office',
    extensions: ['pptx'],
    mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    officeMainPart: 'ppt/presentation.xml',
  },
] as const satisfies readonly AttachmentTypeDefinition[]

export type AttachmentTypeId = (typeof attachmentCatalog)[number]['id']

export const attachmentTypeIds = attachmentCatalog.map((type) => type.id) as AttachmentTypeId[]

/** Types enabled out of the box when an admin turns attachments on. Office/text are opt-in. */
export const DEFAULT_ALLOWED_TYPE_IDS: readonly AttachmentTypeId[] = ['png', 'jpeg', 'webp', 'pdf']

export function findTypeById(id: string): AttachmentTypeDefinition | undefined {
  return attachmentCatalog.find((type) => type.id === id)
}

export function extensionOf(filename: string): string {
  const dot = filename.lastIndexOf('.')
  return dot > 0 ? filename.slice(dot + 1).toLowerCase() : ''
}

/** Resolve a declared (filename, mime) pair to exactly one catalog type, or undefined. */
export function matchDeclaredType(
  filename: string,
  mime: string,
  allowedIds: readonly string[],
): AttachmentTypeDefinition | undefined {
  const extension = extensionOf(filename)
  const normalisedMime = mime.trim().toLowerCase()

  return attachmentCatalog.find(
    (type) =>
      allowedIds.includes(type.id) &&
      type.mime === normalisedMime &&
      (type.extensions as readonly string[]).includes(extension),
  )
}
