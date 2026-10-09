import { createContactNotifier, type ContactNotifier } from './notify'
import type { ContactSubmission } from './schema'
import { PayloadContactStore, type ContactNotificationState, type ContactStore } from './store'

export type ContactDeliveryAttachment = {
  contentType: string
  filename: string
  key: string
  sha256: string
  size: number
}

export type ContactDeliveryMessage = ContactSubmission & {
  /** Scanned + verified files; the stored references, never the bytes. */
  attachments?: ContactDeliveryAttachment[]
  recipient: string
  requestId: string
}

export type ContactDeliveryResult = {
  deliveryId?: string
  mode: 'preview' | 'sent'
}

const NOTIFY_TIMEOUT_MS = 5_000
// The route aborts at 8s. Everything after the save (notification + status write) must finish
// inside this budget so an already-stored submission is never reported as a timeout.
const DELIVERY_BUDGET_MS = 7_000
const STATUS_WRITE_RESERVE_MS = 1_000
const MIN_STATUS_WRITE_MS = 100

export interface ContactDelivery {
  readonly kind: string
  deliver(message: ContactDeliveryMessage): Promise<ContactDeliveryResult>
}

export class ContactDeliveryUnavailableError extends Error {
  constructor() {
    super('Contact delivery is not configured for this environment.')
    this.name = 'ContactDeliveryUnavailableError'
  }
}

class PreviewContactDelivery implements ContactDelivery {
  readonly kind = 'preview'

  async deliver(): Promise<ContactDeliveryResult> {
    return {
      deliveryId: 'preview-no-send',
      mode: 'preview',
    }
  }
}

/**
 * Production delivery: the CMS inbox is the source of truth. Email is a best-effort notification
 * and can never make an already-stored submission fail.
 */
export class PersistingContactDelivery implements ContactDelivery {
  readonly kind = 'cms'

  constructor(
    private readonly store: ContactStore,
    private readonly notifier: ContactNotifier,
  ) {}

  async deliver(message: ContactDeliveryMessage): Promise<ContactDeliveryResult> {
    const startedAt = Date.now()
    const remaining = () => DELIVERY_BUDGET_MS - (Date.now() - startedAt)
    const { duplicate, id } = await this.store.save(message)
    const result: ContactDeliveryResult = { deliveryId: message.requestId, mode: 'sent' }

    // A retry of an already-stored submission: it was handled (and notified) the first time.
    if (duplicate) return result

    if (this.notifier.kind === 'none') {
      await this.mark(id, remaining(), 'skipped')
      return result
    }

    const notifyBudget = Math.min(NOTIFY_TIMEOUT_MS, remaining() - STATUS_WRITE_RESERVE_MS)
    if (notifyBudget <= 0) {
      await this.mark(id, remaining(), 'failed', 'NotificationDeadlineExceeded')
      return result
    }

    try {
      await notifyWithTimeout(this.notifier, message, notifyBudget)
      await this.mark(id, remaining(), 'sent')
    } catch (error) {
      const errorName = error instanceof Error ? error.name : 'UnknownError'
      const timedOut = error instanceof NotificationTimeoutError
      console.error(
        'CONTACT_NOTIFY_FAILED',
        JSON.stringify({
          error: errorName,
          notifier: this.notifier.kind,
          requestId: message.requestId,
        }),
      )
      await this.mark(id, remaining(), timedOut ? 'unknown' : 'failed', errorName)
    }

    return result
  }

  /**
   * Best-effort status write bounded by the time left in the delivery budget. With (almost) no time
   * left it is skipped, leaving the record `pending`, so the route can never time out on it.
   */
  private async mark(
    id: number | string,
    remainingMs: number,
    state: ContactNotificationState,
    errorName?: string,
  ) {
    if (remainingMs <= MIN_STATUS_WRITE_MS) return

    try {
      await withTimeout(
        this.store.markNotification(id, state, errorName),
        Math.min(STATUS_WRITE_RESERVE_MS, remainingMs),
      )
    } catch {
      // The submission itself is stored; a status write failure must not surface to the visitor.
    }
  }
}

class NotificationTimeoutError extends Error {
  constructor() {
    super('Notification timed out.')
    this.name = 'NotificationTimeout'
  }
}

/** Aborts the provider request when the budget runs out, so a late success cannot contradict the recorded state. */
async function notifyWithTimeout(
  notifier: ContactNotifier,
  message: ContactDeliveryMessage,
  timeoutMs: number,
) {
  const controller = new AbortController()
  let timeout: ReturnType<typeof setTimeout> | undefined

  try {
    await Promise.race([
      notifier.notify(message, controller.signal),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => {
          controller.abort()
          reject(new NotificationTimeoutError())
        }, timeoutMs)
      }),
    ])
  } finally {
    if (timeout) clearTimeout(timeout)
  }
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error('Notification timed out.')), timeoutMs)
      }),
    ])
  } finally {
    if (timeout) clearTimeout(timeout)
  }
}

class UnavailableContactDelivery implements ContactDelivery {
  readonly kind = 'unavailable'

  async deliver(): Promise<ContactDeliveryResult> {
    throw new ContactDeliveryUnavailableError()
  }
}

type ContactDeliveryEnvironment = {
  CONTEXT?: string
  NODE_ENV?: string
  PAYLOAD_BUILD_CONTEXT?: string
}

export function createContactDelivery(
  env: ContactDeliveryEnvironment = {
    CONTEXT: process.env.CONTEXT,
    NODE_ENV: process.env.NODE_ENV,
    PAYLOAD_BUILD_CONTEXT: process.env.PAYLOAD_BUILD_CONTEXT,
  },
): ContactDelivery {
  const context = env.PAYLOAD_BUILD_CONTEXT || env.CONTEXT

  if (context === 'deploy-preview' || context === 'branch-deploy') {
    return new PreviewContactDelivery()
  }

  if (!context && env.NODE_ENV !== 'production') {
    return new PreviewContactDelivery()
  }

  if (context === 'production') {
    return new PersistingContactDelivery(new PayloadContactStore(), createContactNotifier())
  }

  return new UnavailableContactDelivery()
}
