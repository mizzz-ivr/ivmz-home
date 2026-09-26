import type { ContactSubmission } from './schema'

export type ContactDeliveryMessage = ContactSubmission & {
  recipient: string
  requestId: string
}

export type ContactDeliveryResult = {
  deliveryId?: string
  mode: 'preview' | 'sent'
}

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

class UnavailableContactDelivery implements ContactDelivery {
  readonly kind = 'unavailable'

  async deliver(): Promise<ContactDeliveryResult> {
    throw new ContactDeliveryUnavailableError()
  }
}

type ContactDeliveryEnvironment = {
  PAYLOAD_BUILD_CONTEXT?: string
}

export function createContactDelivery(
  env: ContactDeliveryEnvironment = {
    PAYLOAD_BUILD_CONTEXT: process.env.PAYLOAD_BUILD_CONTEXT,
  },
): ContactDelivery {
  if (
    env.PAYLOAD_BUILD_CONTEXT === 'deploy-preview' ||
    env.PAYLOAD_BUILD_CONTEXT === 'branch-deploy' ||
    !env.PAYLOAD_BUILD_CONTEXT
  ) {
    return new PreviewContactDelivery()
  }

  return new UnavailableContactDelivery()
}
