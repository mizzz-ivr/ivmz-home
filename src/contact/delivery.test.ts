import { describe, expect, it, vi } from 'vitest'

import {
  ContactDeliveryUnavailableError,
  PersistingContactDelivery,
  createContactDelivery,
} from './delivery'
import type { ContactNotifier } from './notify'
import type { ContactStore } from './store'

const message = {
  category: 'personal' as const,
  email: 'visitor@example.com',
  message: 'Hello',
  name: 'Visitor',
  recipient: 'ivmz@ivrm.jp',
  requestId: 'request-id',
  subject: 'Hello',
}

describe('createContactDelivery', () => {
  it('never sends real email from Deploy Preview', async () => {
    const delivery = createContactDelivery({
      PAYLOAD_BUILD_CONTEXT: 'deploy-preview',
    })

    expect(delivery.kind).toBe('preview')
    await expect(delivery.deliver(message)).resolves.toEqual({
      deliveryId: 'preview-no-send',
      mode: 'preview',
    })
  })

  it('supports local development without real delivery', async () => {
    const delivery = createContactDelivery({
      NODE_ENV: 'development',
    })

    expect(delivery.kind).toBe('preview')
  })

  it('stores submissions in the CMS inbox in Production', () => {
    const delivery = createContactDelivery({
      PAYLOAD_BUILD_CONTEXT: 'production',
    })

    expect(delivery.kind).toBe('cms')
  })

  it('fails closed when production runtime context is unexpectedly missing', async () => {
    const delivery = createContactDelivery({
      NODE_ENV: 'production',
    })

    expect(delivery.kind).toBe('unavailable')
    await expect(delivery.deliver(message)).rejects.toBeInstanceOf(ContactDeliveryUnavailableError)
  })
})

function fakeStore() {
  const marks: Array<[number | string, string, string | undefined]> = []
  const store: ContactStore = {
    markNotification: async (id, state, errorName) => {
      marks.push([id, state, errorName])
    },
    save: async () => ({ id: 7 }),
  }
  return { marks, store }
}

describe('PersistingContactDelivery', () => {
  it('stores first and marks the notification skipped when email is not configured', async () => {
    const { marks, store } = fakeStore()
    const notifier: ContactNotifier = { kind: 'none', notify: async () => {} }

    const result = await new PersistingContactDelivery(store, notifier).deliver(message)

    expect(result).toEqual({ deliveryId: 'request-id', mode: 'sent' })
    expect(marks).toEqual([[7, 'skipped', undefined]])
  })

  it('marks the notification sent after a successful email', async () => {
    const { marks, store } = fakeStore()
    const notifier: ContactNotifier = { kind: 'ses', notify: async () => {} }

    await new PersistingContactDelivery(store, notifier).deliver(message)

    expect(marks).toEqual([[7, 'sent', undefined]])
  })

  it('keeps the submission successful when the email notification fails', async () => {
    const { marks, store } = fakeStore()
    const notifier: ContactNotifier = {
      kind: 'ses',
      notify: async () => {
        throw new Error('ses down')
      },
    }
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(new PersistingContactDelivery(store, notifier).deliver(message)).resolves.toEqual({
      deliveryId: 'request-id',
      mode: 'sent',
    })
    expect(marks).toEqual([[7, 'failed', 'Error']])
    expect(JSON.stringify(spy.mock.calls)).not.toContain('visitor@example.com')
    spy.mockRestore()
  })

  it('fails the request when the submission cannot be stored', async () => {
    const store: ContactStore = {
      markNotification: async () => {},
      save: async () => {
        throw new Error('db down')
      },
    }
    const notifier: ContactNotifier = { kind: 'ses', notify: vi.fn() }

    await expect(new PersistingContactDelivery(store, notifier).deliver(message)).rejects.toThrow(
      'db down',
    )
    expect(notifier.notify).not.toHaveBeenCalled()
  })

  it('does not fail when only the status write fails', async () => {
    const store: ContactStore = {
      markNotification: async () => {
        throw new Error('status write failed')
      },
      save: async () => ({ id: 1 }),
    }
    const notifier: ContactNotifier = { kind: 'ses', notify: async () => {} }

    await expect(
      new PersistingContactDelivery(store, notifier).deliver(message),
    ).resolves.toMatchObject({ mode: 'sent' })
  })
})

describe('PersistingContactDelivery deadline', () => {
  it('skips the notification when the save consumed the budget', async () => {
    vi.useFakeTimers()
    const marks: Array<[number | string, string, string | undefined]> = []
    const store: ContactStore = {
      markNotification: async (id, state, errorName) => {
        marks.push([id, state, errorName])
      },
      save: async () => {
        vi.advanceTimersByTime(6_500)
        return { id: 3 }
      },
    }
    const notify = vi.fn()
    const notifier: ContactNotifier = { kind: 'ses', notify }

    const result = await new PersistingContactDelivery(store, notifier).deliver(message)

    expect(result.mode).toBe('sent')
    expect(notify).not.toHaveBeenCalled()
    expect(marks).toEqual([[3, 'failed', 'NotificationDeadlineExceeded']])
    vi.useRealTimers()
  })

  it('does not even write a status when the save used the whole budget', async () => {
    vi.useFakeTimers()
    const markNotification = vi.fn()
    const store: ContactStore = {
      markNotification,
      save: async () => {
        vi.advanceTimersByTime(7_500)
        return { id: 4 }
      },
    }
    const notify = vi.fn()

    const result = await new PersistingContactDelivery(store, { kind: 'ses', notify }).deliver(
      message,
    )

    expect(result.mode).toBe('sent')
    expect(notify).not.toHaveBeenCalled()
    expect(markNotification).not.toHaveBeenCalled()
    vi.useRealTimers()
  })
})
