import type { ContactDeliveryMessage } from './delivery'

export type ContactNotificationState = 'failed' | 'sent' | 'skipped'

export interface ContactStore {
  save(message: ContactDeliveryMessage): Promise<{ id: number | string }>
  markNotification(
    id: number | string,
    state: ContactNotificationState,
    errorName?: string,
  ): Promise<void>
}

/** Payload Local API store. Loaded lazily so the route's unit tests never initialise Payload. */
export class PayloadContactStore implements ContactStore {
  private async payload() {
    const [{ getPayload }, { default: config }] = await Promise.all([
      import('payload'),
      import('../payload.config'),
    ])
    return getPayload({ config })
  }

  async save(message: ContactDeliveryMessage) {
    const payload = await this.payload()
    const doc = await payload.create({
      collection: 'contact-submissions',
      data: {
        category: message.category,
        email: message.email,
        message: message.message,
        name: message.name,
        notification: 'pending',
        recipient: message.recipient,
        requestId: message.requestId,
        status: 'new',
        subject: message.subject,
      },
      overrideAccess: true,
    })
    return { id: doc.id }
  }

  async markNotification(id: number | string, state: ContactNotificationState, errorName?: string) {
    const payload = await this.payload()
    await payload.update({
      collection: 'contact-submissions',
      data: {
        notification: state,
        notificationError: errorName ? errorName.slice(0, 120) : null,
      },
      id,
      overrideAccess: true,
    })
  }
}
