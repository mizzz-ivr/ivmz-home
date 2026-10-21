import { beforeEach, describe, expect, it, vi } from 'vitest'

const find = vi.fn()
const create = vi.fn()
const update = vi.fn()

vi.mock('payload', () => ({ getPayload: async () => ({ create, find, update }) }))
vi.mock('../payload.config', () => ({ default: {} }))

import { PayloadContactStore } from './store'

const message = {
  category: 'personal' as const,
  email: 'visitor@example.com',
  message: 'Hello',
  name: 'Visitor',
  recipient: 'ivmz@ivrm.jp',
  requestId: 'req-1',
  subject: 'Hi',
}

beforeEach(() => {
  find.mockReset().mockResolvedValue({ docs: [] })
  create.mockReset().mockResolvedValue({ id: 7 })
  update.mockReset().mockResolvedValue({ id: 7 })
})

describe('PayloadContactStore.save', () => {
  it('stores the verified attachment references so the Inbox can offer downloads', async () => {
    const attachments = [
      {
        contentType: 'application/pdf',
        filename: 'cv.pdf',
        key: 'clean/abc',
        sha256: 'h',
        size: 10,
      },
    ]

    await expect(new PayloadContactStore().save({ ...message, attachments })).resolves.toEqual({
      id: 7,
    })

    expect(create.mock.calls[0][0].data.attachments).toEqual(attachments)
    expect(Date.parse(create.mock.calls[0][0].data.lastInteractionAt)).not.toBeNaN()
  })

  it('writes no attachments field for messages without files', async () => {
    await new PayloadContactStore().save(message)
    expect(create.mock.calls[0][0].data).not.toHaveProperty('attachments')
    expect(Date.parse(create.mock.calls[0][0].data.lastInteractionAt)).not.toBeNaN()
  })

  it('does not write again for an already stored requestId', async () => {
    find.mockResolvedValue({ docs: [{ id: 3 }] })
    await expect(new PayloadContactStore().save(message)).resolves.toEqual({
      duplicate: true,
      id: 3,
    })
    expect(create).not.toHaveBeenCalled()
  })
})

describe('PayloadContactStore.markNotification', () => {
  it('does not extend the visitor interaction timestamp when email status changes', async () => {
    const store = new PayloadContactStore()

    await store.markNotification(7, 'sent')
    await store.markNotification(7, 'unknown', 'NotificationTimeout')

    expect(update).toHaveBeenNthCalledWith(1, {
      collection: 'contact-submissions',
      data: { notification: 'sent', notificationError: null },
      id: 7,
      overrideAccess: true,
    })
    expect(update).toHaveBeenNthCalledWith(2, {
      collection: 'contact-submissions',
      data: { notification: 'unknown', notificationError: 'NotificationTimeout' },
      id: 7,
      overrideAccess: true,
    })
    for (const [options] of update.mock.calls) {
      expect(options.data).not.toHaveProperty('lastInteractionAt')
    }
  })
})
