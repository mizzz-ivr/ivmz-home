import sharp from 'sharp'

import type { AttachmentTypeDefinition } from './catalog'
import { ZipRejectedError, readZipEntries, readZipEntryText } from './zip'

export type VerifyResult =
  | { ok: true; bytes: Buffer; sanitized: boolean }
  | { ok: false; reason: string }

const MAX_IMAGE_PIXELS = 40_000_000

const reject = (reason: string): VerifyResult => ({ ok: false, reason })

function hasPrefix(buffer: Buffer, bytes: readonly number[], offset = 0) {
  return bytes.every((value, index) => buffer[offset + index] === value)
}

function matchesSignature(type: AttachmentTypeDefinition, buffer: Buffer): boolean {
  switch (type.id) {
    case 'png':
      return hasPrefix(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    case 'jpeg':
      return hasPrefix(buffer, [0xff, 0xd8, 0xff])
    case 'webp':
      return (
        buffer.toString('latin1', 0, 4) === 'RIFF' && buffer.toString('latin1', 8, 12) === 'WEBP'
      )
    case 'pdf':
      return buffer.subarray(0, 1024).includes('%PDF-')
    default:
      return true
  }
}

async function verifyImage(type: AttachmentTypeDefinition, buffer: Buffer): Promise<VerifyResult> {
  try {
    // Re-encoding drops metadata, trailing payloads and polyglot tricks; only pixels survive.
    const pipeline = sharp(buffer, { failOn: 'error', limitInputPixels: MAX_IMAGE_PIXELS }).rotate()
    const bytes =
      type.id === 'png'
        ? await pipeline.png().toBuffer()
        : type.id === 'jpeg'
          ? await pipeline.jpeg({ quality: 92 }).toBuffer()
          : await pipeline.webp({ quality: 90 }).toBuffer()
    return { ok: true, bytes, sanitized: true }
  } catch {
    return reject('image_invalid')
  }
}

const ACTIVE_PDF_TOKENS = [
  '/JavaScript',
  '/JS',
  '/Launch',
  '/EmbeddedFile',
  '/OpenAction',
  '/RichMedia',
  '/XFA',
  '/AA',
  '/SubmitForm',
  '/ImportData',
]

/** Defence in depth on top of the malware scan: refuse PDFs that declare active content. */
function verifyPdf(buffer: Buffer): VerifyResult {
  const text = buffer.toString('latin1')
  // Match whole PDF names only (`/JS` must not match `/JSON...`).
  const found = ACTIVE_PDF_TOKENS.some((token) => new RegExp(`${token}(?![A-Za-z0-9])`).test(text))
  return found ? reject('pdf_active_content') : { ok: true, bytes: buffer, sanitized: false }
}

function verifyText(buffer: Buffer): VerifyResult {
  if (buffer.includes(0)) return reject('text_binary')
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(buffer)
  } catch {
    return reject('text_encoding')
  }
  return { ok: true, bytes: buffer, sanitized: false }
}

const BLOCKED_PART_PATTERNS = [
  /(^|\/)vbaproject\.bin$/i,
  /(^|\/)vbadata\.xml$/i,
  /(^|\/)activex\//i,
  /(^|\/)embeddings\//i,
  /(^|\/)macrosheets\//i,
  /\.(exe|dll|bat|cmd|com|scr|msi|ps1|vbs|js|jar|lnk|hta|sh)$/i,
]

const BLOCKED_RELATIONSHIPS = /(attachedTemplate|oleObject|externalLink|\/frame|\/package)/i

function verifyOffice(type: AttachmentTypeDefinition, buffer: Buffer): VerifyResult {
  try {
    const entries = readZipEntries(buffer)
    const names = new Set(entries.map((entry) => entry.name))

    if (!names.has('[Content_Types].xml')) return reject('office_structure')
    if (type.officeMainPart && !names.has(type.officeMainPart))
      return reject('office_type_mismatch')
    if (
      entries.some((entry) => BLOCKED_PART_PATTERNS.some((pattern) => pattern.test(entry.name)))
    ) {
      return reject('office_active_content')
    }

    const contentTypes = readZipEntryText(
      buffer,
      entries.find((entry) => entry.name === '[Content_Types].xml')!,
    )
    if (/macroEnabled|vbaProject|template\.main/i.test(contentTypes)) {
      return reject('office_macro')
    }

    for (const entry of entries) {
      if (!entry.name.endsWith('.rels')) continue
      if (BLOCKED_RELATIONSHIPS.test(readZipEntryText(buffer, entry))) {
        return reject('office_external_reference')
      }
    }
  } catch (error) {
    return reject(error instanceof ZipRejectedError ? error.reason : 'office_structure')
  }

  return { ok: true, bytes: buffer, sanitized: false }
}

/**
 * Runs after the managed malware scan reported a clean object. It confirms the bytes really are
 * the declared type, removes what can be removed (image metadata) and refuses active content.
 */
export async function verifyAttachmentContent(
  type: AttachmentTypeDefinition,
  buffer: Buffer,
): Promise<VerifyResult> {
  if (buffer.length === 0) return reject('empty_file')
  if (!matchesSignature(type, buffer)) return reject('type_mismatch')
  if (type.kind === 'office' && !hasPrefix(buffer, [0x50, 0x4b, 0x03, 0x04])) {
    return reject('type_mismatch')
  }

  switch (type.kind) {
    case 'image':
      return verifyImage(type, buffer)
    case 'pdf':
      return verifyPdf(buffer)
    case 'text':
      return verifyText(buffer)
    case 'office':
      return verifyOffice(type, buffer)
  }
}
