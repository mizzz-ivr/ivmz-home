import { createContactNotifier, type ContactNotifier } from './notify'
import type { ContactSubmission } from './schema'
import { PayloadContactStore, type ContactStore } from './store'

export type ContactDeliveryMessage = ContactSubmission & {
  recipient: string
  requestId: string
}

export type ContactDeliveryResult = {
  deliveryId?: string
  mode: 'preview' | 'sent'
}

const NOTIFY_TIMEOUT_MS = 5_000

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
    const { id } = await this.store.save(message)

    if (this.notifier.kind === 'none') {
      await this.mark(id, 'skipped')
      return { deliveryId: message.requestId, mode: 'sent' }
    }

    try {
      await withTimeout(this.notifier.notify(message), NOTIFY_TIMEOUT_MS)
      await this.mark(id, 'sent')
    } catch (error) {
      const errorName = error instanceof Error ? error.name : 'UnknownError'
      console.error(
        'CONTACT_NOTIFY_FAILED',
        JSON.stringify({
          error: errorName,
          notifier: this.notifier.kind,
          requestId: message.requestId,
        }),
      )
      await this.mark(id, 'failed', errorName)
    }

    return { deliveryId: message.requestId, mode: 'sent' }
  }

  private async mark(
    id: number | string,
    state: 'failed' | 'sent' | 'skipped',
    errorName?: string,
  ) {
    try {
      await this.store.markNotification(id, state, errorName)
    } catch {
      // The submission itself is stored; a status write failure must not surface to the visitor.
    }
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
