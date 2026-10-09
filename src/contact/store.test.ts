import { beforeEach, describe, expect, it, vi } from 'vitest'

const find = vi.fn()
const create = vi.fn()

vi.mock('payload', () => ({ getPayload: async () => ({ create, find }) }))
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
  })

  it('writes no attachments field for messages without files', async () => {
    await new PayloadContactStore().save(message)
    expect(create.mock.calls[0][0].data).not.toHaveProperty('attachments')
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
