import {
  DeleteObjectCommand,
  GetObjectCommand,
  GetObjectTaggingCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { createPresignedPost } from '@aws-sdk/s3-presigned-post'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

export type ScanStatus = 'pending' | 'clean' | 'infected' | 'failed' | 'missing'

export type UploadForm = { url: string; fields: Record<string, string> }

export interface AttachmentStorage {
  /** Presigned POST into the quarantine prefix; S3 itself enforces size and content type. */
  createUploadForm(input: {
    key: string
    mime: string
    size: number
    expiresInSeconds: number
  }): Promise<UploadForm>
  getScanStatus(key: string): Promise<ScanStatus>
  /** Reads at most `maxBytes`; throws if the object is larger. */
  readObject(key: string, maxBytes: number): Promise<Buffer>
  putObject(key: string, bytes: Buffer, mime: string): Promise<void>
  exists(key: string): Promise<boolean>
  deleteObject(key: string): Promise<void>
  createDownloadUrl(key: string, filename: string, expiresInSeconds: number): Promise<string>
}

export const QUARANTINE_PREFIX = 'quarantine/'
export const CLEAN_PREFIX = 'clean/'

/** Tag written by GuardDuty Malware Protection for S3 on every scanned object. */
export const SCAN_TAG = 'GuardDutyMalwareScanStatus'

export function mapGuardDutyStatus(value: string | undefined): ScanStatus {
  if (!value) return 'pending'
  if (value === 'NO_THREATS_FOUND') return 'clean'
  if (value === 'THREATS_FOUND') return 'infected'
  // UNSUPPORTED, ACCESS_DENIED, FAILED, or anything new: never treat as clean.
  return 'failed'
}

function isNotFound(error: unknown) {
  const name = error instanceof Error ? error.name : ''
  return name === 'NoSuchKey' || name === 'NotFound'
}

function contentDisposition(filename: string) {
  const ascii = filename.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_')
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`
}

export class S3AttachmentStorage implements AttachmentStorage {
  constructor(
    private readonly client: S3Client,
    private readonly bucket: string,
  ) {}

  async createUploadForm({
    key,
    mime,
    size,
    expiresInSeconds,
  }: Parameters<AttachmentStorage['createUploadForm']>[0]) {
    const { url, fields } = await createPresignedPost(this.client, {
      Bucket: this.bucket,
      Conditions: [
        ['content-length-range', size, size],
        ['eq', '$Content-Type', mime],
      ],
      Expires: expiresInSeconds,
      Fields: { 'Content-Type': mime },
      Key: key,
    })
    return { fields, url }
  }

  async getScanStatus(key: string): Promise<ScanStatus> {
    try {
      const { TagSet } = await this.client.send(
        new GetObjectTaggingCommand({ Bucket: this.bucket, Key: key }),
      )
      return mapGuardDutyStatus(TagSet?.find((tag) => tag.Key === SCAN_TAG)?.Value)
    } catch (error) {
      if (isNotFound(error)) return 'missing'
      throw error
    }
  }

  async readObject(key: string, maxBytes: number) {
    if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) {
      throw new Error('Invalid object size limit.')
    }

    const head = await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }))
    const expectedSize = head.ContentLength
    if (
      expectedSize === undefined ||
      !Number.isSafeInteger(expectedSize) ||
      expectedSize < 1 ||
      expectedSize > maxBytes
    ) {
      throw new Error('Object exceeds the allowed size or has unknown length.')
    }
    if (!head.ETag) throw new Error('Object version cannot be verified.')

    // HEAD and GET are separate requests: the quarantine object could be replaced in between.
    // If-Match refuses a different version; Range caps download size even if it was replaced.
    const { Body } = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        IfMatch: head.ETag,
        Key: key,
        Range: `bytes=0-${maxBytes}`,
      }),
    )
    if (!Body) throw new Error('Object has no body.')

    // Never buffer an untrusted S3 response without an application-level cap.
    // Even if an endpoint ignores Range, stop consuming the stream before allocating > maxBytes.
    const chunks: Buffer[] = []
    let received = 0
    for await (const chunk of Body) {
      const bytes = Buffer.from(chunk)
      if (bytes.length > maxBytes - received) {
        throw new Error('Object exceeds the allowed size during download.')
      }
      chunks.push(bytes)
      received += bytes.length
    }
    if (received !== expectedSize) {
      throw new Error('Object size changed during download.')
    }
    return Buffer.concat(chunks, received)
  }

  async putObject(key: string, bytes: Buffer, mime: string) {
    await this.client.send(
      new PutObjectCommand({
        Body: bytes,
        Bucket: this.bucket,
        ContentDisposition: 'attachment',
        ContentType: mime,
        Key: key,
        ServerSideEncryption: 'AES256',
      }),
    )
  }

  async exists(key: string) {
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }))
      return true
    } catch (error) {
      if (isNotFound(error)) return false
      throw error
    }
  }

  async deleteObject(key: string) {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }))
  }

  createDownloadUrl(key: string, filename: string, expiresInSeconds: number) {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ResponseContentDisposition: contentDisposition(filename),
        ResponseContentType: 'application/octet-stream',
      }),
      { expiresIn: expiresInSeconds },
    )
  }
}

type StorageEnvironment = {
  CONTACT_ATTACH_ACCESS_KEY_ID?: string
  CONTACT_ATTACH_BUCKET?: string
  CONTACT_ATTACH_REGION?: string
  CONTACT_ATTACH_SECRET_ACCESS_KEY?: string
}

/** Storage exists only when all four dedicated variables are set; otherwise attachments are off. */
export function createAttachmentStorage(
  env: StorageEnvironment = {
    CONTACT_ATTACH_ACCESS_KEY_ID: process.env.CONTACT_ATTACH_ACCESS_KEY_ID,
    CONTACT_ATTACH_BUCKET: process.env.CONTACT_ATTACH_BUCKET,
    CONTACT_ATTACH_REGION: process.env.CONTACT_ATTACH_REGION,
    CONTACT_ATTACH_SECRET_ACCESS_KEY: process.env.CONTACT_ATTACH_SECRET_ACCESS_KEY,
  },
): AttachmentStorage | null {
  const { CONTACT_ATTACH_ACCESS_KEY_ID, CONTACT_ATTACH_BUCKET, CONTACT_ATTACH_REGION } = env
  const secret = env.CONTACT_ATTACH_SECRET_ACCESS_KEY
  if (
    !CONTACT_ATTACH_ACCESS_KEY_ID ||
    !CONTACT_ATTACH_BUCKET ||
    !CONTACT_ATTACH_REGION ||
    !secret
  ) {
    return null
  }

  return new S3AttachmentStorage(
    new S3Client({
      credentials: { accessKeyId: CONTACT_ATTACH_ACCESS_KEY_ID, secretAccessKey: secret },
      region: CONTACT_ATTACH_REGION,
    }),
    CONTACT_ATTACH_BUCKET,
  )
}
