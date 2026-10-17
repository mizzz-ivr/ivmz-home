import { GetObjectCommand, HeadObjectCommand, type S3Client } from '@aws-sdk/client-s3'
import { describe, expect, it, vi } from 'vitest'

import { S3AttachmentStorage } from './storage'

function setup(head: { ContentLength?: number; ETag?: string }, bytes: Uint8Array) {
  const send = vi.fn(async (command: unknown) => {
    if (command instanceof HeadObjectCommand) return head
    if (command instanceof GetObjectCommand) {
      return { Body: { transformToByteArray: async () => bytes } }
    }
    throw new Error('Unexpected command.')
  })
  const client = { send } as unknown as S3Client
  const storage = new S3AttachmentStorage(client, 'private-test-bucket')
  return { send, storage }
}

describe('S3AttachmentStorage.readObject', () => {
  it('pins ETag and caps the S3 GET response', async () => {
    const { send, storage } = setup({ ContentLength: 3, ETag: '"original-etag"' }, Buffer.from('abc'))
    const content = await storage.readObject('quarantine/test-id', 3)
    expect(content).toEqual(Buffer.from('abc'))
    const request = send.mock.calls[1][0]
    expect(request).toBeInstanceOf(GetObjectCommand)
    if (!(request instanceof GetObjectCommand)) {
      throw new Error('Expected GetObjectCommand.')
    }
    expect(request.input).toMatchObject({
      Bucket: 'private-test-bucket',
      IfMatch: '"original-etag"',
      Key: 'quarantine/test-id',
      Range: 'bytes=0-3',
    })
  })

  it('rejects unknown size, large content or absent ETag', async () => {
    for (const head of [
      {},
      { ContentLength: 4, ETag: '"etag"' },
      { ContentLength: 2 },
      { ContentLength: 0, ETag: '"etag"' },
    ]) {
      const { send, storage } = setup(head, Buffer.from('abc'))
      await expect(storage.readObject('quarantine/test', 3)).rejects.toThrow()
      expect(send).toHaveBeenCalledTimes(1)
    }
  })

  it('rejects unsafe bounds before calling S3', async () => {
    const { send, storage } = setup({ ContentLength: 3, ETag: '"etag"' }, Buffer.from('abc'))
    await expect(storage.readObject('quarantine/test', 0)).rejects.toThrow()
    await expect(storage.readObject('quarantine/test', Number.NaN)).rejects.toThrow()
    expect(send).not.toHaveBeenCalled()
  })

  it('rejects data changed or truncated between HEAD and GET', async () => {
    for (const bytes of [Buffer.from('abcd'), Buffer.from('ab')]) {
      const { storage } = setup({ ContentLength: 3, ETag: '"etag"' }, bytes)
      await expect(storage.readObject('quarantine/test', 3)).rejects.toThrow(
        'Object size changed during download.',
      )
    }
  })
})
