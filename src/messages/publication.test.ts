import { describe, expect, it } from 'vitest'

import { toPublicAnonymousMessage } from './publication'

const published = {
  isPublic: true,
  status: 'replied',
  message: 'ありがとう！',
  reply: 'こちらこそ！',
  publicId: 'J6-vhsw_vSh1sEOWVtR-7K1W',
  publishedAt: '2026-10-18T00:00:00.000Z',
  internalNote: '公開禁止の内部メモ',
  requestId: 'private-request-id',
  sourceIp: 'private-ip',
}

describe('anonymous message publication projection', () => {
  it('returns only explicitly whitelisted public fields', () => {
    expect(toPublicAnonymousMessage(published)).toEqual({
      message: 'ありがとう！',
      reply: 'こちらこそ！',
      publicId: published.publicId,
      publishedAt: published.publishedAt,
    })
    expect(toPublicAnonymousMessage(published)).not.toHaveProperty('internalNote')
    expect(toPublicAnonymousMessage(published)).not.toHaveProperty('requestId')
    expect(toPublicAnonymousMessage(published)).not.toHaveProperty('sourceIp')
  })

  it('never exposes unapproved, hidden, spam or un-replied messages', () => {
    for (const changes of [
      { isPublic: false },
      { isPublic: null },
      { status: 'new' },
      { status: 'read' },
      { status: 'hidden' },
      { status: 'spam' },
      { reply: null },
      { reply: '  ' },
    ]) {
      expect(toPublicAnonymousMessage({ ...published, ...changes })).toBeNull()
    }
    expect(toPublicAnonymousMessage(null)).toBeNull()
  })

  it('rejects missing or malformed public ids and publish timestamps', () => {
    for (const changes of [
      { publicId: '' },
      { publicId: 'short' },
      { publicId: '../private' },
      { publishedAt: null },
      { publishedAt: 'not-a-date' },
      { message: '' },
    ]) {
      expect(toPublicAnonymousMessage({ ...published, ...changes })).toBeNull()
    }
  })

  it('removes a previously public message from projections after it is hidden', () => {
    expect(toPublicAnonymousMessage(published)).not.toBeNull()
    expect(toPublicAnonymousMessage({ ...published, isPublic: false })).toBeNull()
  })
})
