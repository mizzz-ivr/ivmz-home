// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const documentInfo = {
  collectionSlug: 'anonymous-messages',
  data: { isPublic: false, message: 'ありがとう', reply: 'こちらこそ', status: 'replied' },
  id: 42,
}
const form = { modified: false, processing: false }

vi.mock('@payloadcms/ui', () => ({
  useDocumentInfo: () => documentInfo,
  useForm: () => form,
}))

import { AnonymousPublicationActionsClient } from './AnonymousPublicationActionsClient'

beforeEach(() => {
  documentInfo.collectionSlug = 'anonymous-messages'
  documentInfo.data = {
    isPublic: false,
    message: 'ありがとう',
    reply: 'こちらこそ',
    status: 'replied',
  }
  documentInfo.id = 42
  form.modified = false
  form.processing = false
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('AnonymousPublicationActionsClient', () => {
  it('hides the control for a disabled feature and never sends a request', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    render(<AnonymousPublicationActionsClient enabled={false} />)
    expect(screen.getByText(/公開操作は準備中/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: '公開を承認する' })).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('blocks unsaved edits and missing reviewed replies', () => {
    form.modified = true
    render(<AnonymousPublicationActionsClient enabled />)
    expect(screen.getByRole('button', { name: '公開を承認する' }).hasAttribute('disabled')).toBe(
      true,
    )
    cleanup()
    form.modified = false
    documentInfo.data.reply = ''
    render(<AnonymousPublicationActionsClient enabled />)
    expect(screen.getByRole('button', { name: '公開を承認する' }).hasAttribute('disabled')).toBe(
      true,
    )
  })

  it('requires explicit confirmation and sends only the document id and action', async () => {
    const request = vi
      .fn()
      .mockResolvedValue(Response.json({ ok: true, code: 'published', publicId: 'a'.repeat(22) }))
    vi.stubGlobal('fetch', request)
    render(<AnonymousPublicationActionsClient enabled />)

    fireEvent.click(screen.getByRole('button', { name: '公開を承認する' }))
    expect(request).not.toHaveBeenCalled()
    expect(screen.getByText(/投稿：ありがとう/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '公開を確定する' }))

    await waitFor(() => expect(request).toHaveBeenCalledTimes(1))
    expect(request).toHaveBeenCalledWith(
      '/api/message/admin/publication',
      expect.objectContaining({
        credentials: 'same-origin',
        method: 'POST',
        body: JSON.stringify({ messageId: 42, action: 'publish' }),
      }),
    )
    expect(await screen.findByText(/公開を承認し、監査履歴に記録/)).toBeTruthy()
    expect(screen.getByRole('link', { name: /最新の保存状態/ })).toHaveAttribute(
      'href',
      '/admin/collections/anonymous-messages/42',
    )
  })

  it('requires a second confirmation for withdrawal and does not repeat a failed request', async () => {
    documentInfo.data.isPublic = true
    const request = vi
      .fn()
      .mockResolvedValue(Response.json({ ok: false, code: 'not_public' }, { status: 409 }))
    vi.stubGlobal('fetch', request)
    render(<AnonymousPublicationActionsClient enabled />)
    fireEvent.click(screen.getByRole('button', { name: '公開を取り下げる' }))
    fireEvent.click(screen.getByRole('button', { name: '取り下げを確定する' }))
    expect(await screen.findByText(/この投稿は非公開です/)).toBeTruthy()
    expect(request).toHaveBeenCalledTimes(1)
  })

  it('treats an unknown network outcome as requiring a read before retry', async () => {
    const request = vi.fn().mockRejectedValue(new Error('network interrupted'))
    vi.stubGlobal('fetch', request)
    render(<AnonymousPublicationActionsClient enabled />)
    fireEvent.click(screen.getByRole('button', { name: '公開を承認する' }))
    fireEvent.click(screen.getByRole('button', { name: '公開を確定する' }))
    expect(await screen.findByText(/処理済みの可能性/)).toBeTruthy()
    expect(screen.getByRole('button', { name: '公開を承認する' }).hasAttribute('disabled')).toBe(
      true,
    )
  })
})
