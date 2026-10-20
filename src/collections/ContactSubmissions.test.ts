import type { PayloadRequest } from 'payload'
import { describe, expect, it, vi } from 'vitest'

import {
  canDeleteContactSubmission,
  ContactSubmissions,
  preventAttachedSubmissionDeletion,
} from './ContactSubmissions'

function request(findByID: ReturnType<typeof vi.fn>, collection: string | null = 'users') {
  return {
    payload: {
      config: { admin: { user: 'users' } },
      findByID,
    },
    user: collection ? { collection, id: 1 } : null,
  } as unknown as PayloadRequest
}

describe('ContactSubmissions deletion guard', () => {
  it('denies guests and accounts outside the configured CMS admin collection', () => {
    for (const collection of [null, 'other-users']) {
      const req = request(vi.fn(), collection)
      expect(
        canDeleteContactSubmission({ req } as Parameters<typeof canDeleteContactSubmission>[0]),
      ).toBe(false)
    }
  })

  it('restricts standard CMS deletion to submissions without attachment references', () => {
    const req = request(vi.fn())
    expect(
      canDeleteContactSubmission({ req } as Parameters<typeof canDeleteContactSubmission>[0]),
    ).toEqual({ 'attachments.id': { exists: false } })
    expect(ContactSubmissions.access?.delete).toBe(canDeleteContactSubmission)
    expect(ContactSubmissions.hooks?.beforeDelete).toContain(preventAttachedSubmissionDeletion)
  })

  it('refuses deletion of attached submissions even when the caller overrides access', async () => {
    const findByID = vi.fn().mockResolvedValue({
      attachments: [{ id: 'row-1', key: 'clean/secret-key' }],
    })
    const req = request(findByID)
    await expect(
      preventAttachedSubmissionDeletion({
        id: 42,
        req,
      } as Parameters<typeof preventAttachedSubmissionDeletion>[0]),
    ).rejects.toMatchObject({ status: 409 })
    expect(findByID).toHaveBeenCalledWith({
      collection: 'contact-submissions',
      depth: 0,
      id: 42,
      overrideAccess: true,
      req,
      select: { attachments: true },
    })
  })

  it('permits deleting records with no attached rows', async () => {
    for (const attachments of [undefined, null, []]) {
      const findByID = vi.fn().mockResolvedValue({ attachments })
      await expect(
        preventAttachedSubmissionDeletion({
          id: 42,
          req: request(findByID),
        } as Parameters<typeof preventAttachedSubmissionDeletion>[0]),
      ).resolves.toBeUndefined()
    }
  })

  it('fails closed on unexpected attachment data and DB read failure', async () => {
    const broken = vi.fn().mockResolvedValue({ attachments: { invalid: true } })
    await expect(
      preventAttachedSubmissionDeletion({
        id: 42,
        req: request(broken),
      } as Parameters<typeof preventAttachedSubmissionDeletion>[0]),
    ).rejects.toMatchObject({ status: 409 })

    const databaseFailure = vi.fn().mockRejectedValue(new Error('Database is unavailable'))
    await expect(
      preventAttachedSubmissionDeletion({
        id: 42,
        req: request(databaseFailure),
      } as Parameters<typeof preventAttachedSubmissionDeletion>[0]),
    ).rejects.toThrow('Database is unavailable')
  })
})
