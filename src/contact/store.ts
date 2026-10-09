import type { ContactDeliveryMessage } from './delivery'

export type ContactNotificationState = 'failed' | 'sent' | 'skipped'

export interface ContactStore {
  /** `duplicate` means this requestId was already stored (a retry); nothing new was written. */
  save(message: ContactDeliveryMessage): Promise<{ duplicate?: boolean; id: number | string }>
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

  private async findByRequestId(requestId: string) {
    const payload = await this.payload()
    const existing = await payload.find({
      collection: 'contact-submissions',
      depth: 0,
      limit: 1,
      overrideAccess: true,
      pagination: false,
      where: { requestId: { equals: requestId } },
    })
    return existing.docs[0]
  }

  async save(message: ContactDeliveryMessage) {
    const already = await this.findByRequestId(message.requestId)
    if (already) return { duplicate: true, id: already.id }

    const payload = await this.payload()
    let doc
    try {
      doc = await payload.create({
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
    } catch (error) {
      // A concurrent retry may have won the unique requestId race; that is still a stored message.
      const winner = await this.findByRequestId(message.requestId).catch(() => undefined)
      if (winner) return { duplicate: true, id: winner.id }
      throw error
    }
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
