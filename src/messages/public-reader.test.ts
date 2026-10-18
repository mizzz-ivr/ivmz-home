import { describe, expect, it, vi } from 'vitest'

import { resolveApprovedAnonymousMessage } from './public-reader'

const id = 'J6-vhsw_vSh1sEOWVtR-7K1W'
const candidate = {
  isPublic: true,
  status: 'replied',
  publicId: id,
  publishedAt: '2026-10-18T14:00:00Z',
  message: 'ひとこと',
  reply: 'ありがとうございます',
  internalNote: '運用メモ',
  requestId: 'private-value',
  email: 'private@example.test',
}

describe('read-only public message gate', () => {
  it('never queries when disabled or given an invalid ID', async () => {
    const lookup = vi.fn().mockResolvedValue(candidate)
    expect(await resolveApprovedAnonymousMessage(id, false, lookup)).toBeNull()
    expect(await resolveApprovedAnonymousMessage('../private', true, lookup)).toBeNull()
    expect(await resolveApprovedAnonymousMessage('short', true, lookup)).toBeNull()
    expect(lookup).not.toHaveBeenCalled()
  })

  it('returns only four approved public fields', async () => {
    const lookup = vi.fn().mockResolvedValue(candidate)
    const result = await resolveApprovedAnonymousMessage(id, true, lookup)
    expect(result).toEqual({
      publicId: id,
      message: 'ひとこと',
      reply: 'ありがとうございます',
      publishedAt: '2026-10-18T14:00:00Z',
    })
    expect(JSON.stringify(result)).not.toContain('private')
    expect(lookup).toHaveBeenCalledOnce()
  })

  it('rejects revoked, changed status, missing reply, or mismatched share IDs', async () => {
    for (const altered of [
      { isPublic: false },
      { status: 'hidden' },
      { reply: '' },
      { publicId: 'another-shared-identifier' },
      { publishedAt: null },
    ]) {
      const record = { ...candidate, ...altered }
      const found = await resolveApprovedAnonymousMessage(id, true, async () => record)
      expect(found).toBeNull()
    }
  })

  it('fails closed on database errors and missing records', async () => {
    expect(await resolveApprovedAnonymousMessage(id, true, async () => null)).toBeNull()
    expect(
      await resolveApprovedAnonymousMessage(id, true, async () => {
        throw new Error('connection refused')
      }),
    ).toBeNull()
  })
})
