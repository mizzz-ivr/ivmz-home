import { inflateRawSync } from 'node:zlib'

export type ZipEntry = {
  name: string
  method: number
  compressedSize: number
  uncompressedSize: number
  localHeaderOffset: number
}

export type ZipLimits = {
  maxEntries: number
  maxTotalUncompressed: number
  maxRatio: number
}

export const DEFAULT_ZIP_LIMITS: ZipLimits = {
  maxEntries: 2_000,
  maxTotalUncompressed: 200 * 1024 * 1024,
  maxRatio: 100,
}

export class ZipRejectedError extends Error {
  constructor(readonly reason: string) {
    super(reason)
    this.name = 'ZipRejectedError'
  }
}

const EOCD_SIGNATURE = 0x06054b50
const CENTRAL_SIGNATURE = 0x02014b50
const LOCAL_SIGNATURE = 0x04034b50

/**
 * Reads only the central directory (never extracts to disk). Anything unusual — zip64, encryption,
 * out-of-bounds offsets, path tricks, zip-bomb ratios — is rejected rather than interpreted.
 */
export function readZipEntries(buffer: Buffer, limits: ZipLimits = DEFAULT_ZIP_LIMITS): ZipEntry[] {
  const searchStart = Math.max(0, buffer.length - 0xffff - 22)
  let eocd = -1
  for (let index = buffer.length - 22; index >= searchStart; index -= 1) {
    if (buffer.readUInt32LE(index) === EOCD_SIGNATURE) {
      eocd = index
      break
    }
  }
  if (eocd < 0) throw new ZipRejectedError('zip_structure')

  const entryCount = buffer.readUInt16LE(eocd + 10)
  const centralSize = buffer.readUInt32LE(eocd + 12)
  const centralOffset = buffer.readUInt32LE(eocd + 16)

  if (entryCount === 0xffff || centralSize === 0xffffffff || centralOffset === 0xffffffff) {
    throw new ZipRejectedError('zip64_unsupported')
  }
  if (entryCount === 0 || entryCount > limits.maxEntries) throw new ZipRejectedError('zip_entries')
  if (centralOffset + centralSize > eocd) throw new ZipRejectedError('zip_structure')

  const entries: ZipEntry[] = []
  let cursor = centralOffset
  let totalUncompressed = 0

  for (let count = 0; count < entryCount; count += 1) {
    if (cursor + 46 > buffer.length || buffer.readUInt32LE(cursor) !== CENTRAL_SIGNATURE) {
      throw new ZipRejectedError('zip_structure')
    }
    const flags = buffer.readUInt16LE(cursor + 8)
    const method = buffer.readUInt16LE(cursor + 10)
    const compressedSize = buffer.readUInt32LE(cursor + 20)
    const uncompressedSize = buffer.readUInt32LE(cursor + 24)
    const nameLength = buffer.readUInt16LE(cursor + 28)
    const extraLength = buffer.readUInt16LE(cursor + 30)
    const commentLength = buffer.readUInt16LE(cursor + 32)
    const localHeaderOffset = buffer.readUInt32LE(cursor + 42)

    if (flags & 0x1) throw new ZipRejectedError('zip_encrypted')
    if (compressedSize === 0xffffffff || uncompressedSize === 0xffffffff) {
      throw new ZipRejectedError('zip64_unsupported')
    }
    if (cursor + 46 + nameLength > buffer.length) throw new ZipRejectedError('zip_structure')

    const name = buffer.toString('utf8', cursor + 46, cursor + 46 + nameLength)
    if (name.startsWith('/') || name.includes('\\') || name.split('/').includes('..')) {
      throw new ZipRejectedError('zip_path')
    }

    totalUncompressed += uncompressedSize
    if (totalUncompressed > limits.maxTotalUncompressed) throw new ZipRejectedError('zip_bomb')
    if (
      uncompressedSize > 1024 * 1024 &&
      (compressedSize === 0 || uncompressedSize / compressedSize > limits.maxRatio)
    ) {
      throw new ZipRejectedError('zip_bomb')
    }

    entries.push({ name, method, compressedSize, uncompressedSize, localHeaderOffset })
    cursor += 46 + nameLength + extraLength + commentLength
  }

  return entries
}

/** Inflate one small control part (e.g. `[Content_Types].xml`, `*.rels`) with a hard output cap. */
export function readZipEntryText(buffer: Buffer, entry: ZipEntry, maxBytes = 512 * 1024): string {
  if (entry.uncompressedSize > maxBytes) throw new ZipRejectedError('zip_part_too_large')

  const offset = entry.localHeaderOffset
  if (offset + 30 > buffer.length || buffer.readUInt32LE(offset) !== LOCAL_SIGNATURE) {
    throw new ZipRejectedError('zip_structure')
  }
  const dataStart =
    offset + 30 + buffer.readUInt16LE(offset + 26) + buffer.readUInt16LE(offset + 28)
  const dataEnd = dataStart + entry.compressedSize
  if (dataEnd > buffer.length) throw new ZipRejectedError('zip_structure')

  const raw = buffer.subarray(dataStart, dataEnd)
  try {
    if (entry.method === 0) return raw.toString('utf8')
    if (entry.method === 8) {
      return inflateRawSync(raw, { maxOutputLength: maxBytes }).toString('utf8')
    }
  } catch {
    throw new ZipRejectedError('zip_part_unreadable')
  }
  throw new ZipRejectedError('zip_method')
}
