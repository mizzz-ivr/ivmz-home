import { describe, expect, it } from 'vitest'

import { ContactDeliveryUnavailableError, createContactDelivery } from './delivery'

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

  it('fails closed in Production until a real provider is configured', async () => {
    const delivery = createContactDelivery({
      PAYLOAD_BUILD_CONTEXT: 'production',
    })

    expect(delivery.kind).toBe('unavailable')
    await expect(delivery.deliver(message)).rejects.toBeInstanceOf(ContactDeliveryUnavailableError)
  })

  it('fails closed when production runtime context is unexpectedly missing', async () => {
    const delivery = createContactDelivery({
      NODE_ENV: 'production',
    })

    expect(delivery.kind).toBe('unavailable')
    await expect(delivery.deliver(message)).rejects.toBeInstanceOf(ContactDeliveryUnavailableError)
  })
})
