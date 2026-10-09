import { describe, expect, it, vi } from 'vitest'

import {
  NoopContactNotifier,
  SesContactNotifier,
  buildNotificationEmail,
  createContactNotifier,
} from './notify'

const message = {
  category: 'job' as const,
  email: 'visitor@example.com',
  message: 'Hello there',
  name: 'Visitor',
  recipient: 'ivmz@ivrm.jp',
  requestId: 'request-id',
  subject: 'Work request',
}

describe('createContactNotifier', () => {
  it('is disabled until every CONTACT_* variable is present', () => {
    expect(createContactNotifier({})).toBeInstanceOf(NoopContactNotifier)
    expect(
      createContactNotifier({
        CONTACT_FROM_EMAIL: 'ivmz@ivrm.jp',
        CONTACT_SES_ACCESS_KEY_ID: 'id',
        CONTACT_SES_CONFIGURATION_SET: 'ivmz-contact',
        CONTACT_SES_REGION: 'us-east-2',
      }),
    ).toBeInstanceOf(NoopContactNotifier)
    // Without the configuration set (bounce/complaint events) the notifier stays disabled.
    expect(
      createContactNotifier({
        CONTACT_FROM_EMAIL: 'ivmz@ivrm.jp',
        CONTACT_SES_ACCESS_KEY_ID: 'id',
        CONTACT_SES_REGION: 'us-east-2',
        CONTACT_SES_SECRET_ACCESS_KEY: 'secret',
      }),
    ).toBeInstanceOf(NoopContactNotifier)
  })

  it('enables SES when fully configured', () => {
    const notifier = createContactNotifier({
      CONTACT_FROM_EMAIL: 'ivmz@ivrm.jp',
      CONTACT_SES_ACCESS_KEY_ID: 'id',
      CONTACT_SES_CONFIGURATION_SET: 'ivmz-contact',
      CONTACT_SES_REGION: 'us-east-2',
      CONTACT_SES_SECRET_ACCESS_KEY: 'secret',
    })
    expect(notifier.kind).toBe('ses')
  })
})

describe('buildNotificationEmail', () => {
  it('routes to the server-side recipient and replies to the visitor only', () => {
    const email = buildNotificationEmail(message, 'ivmz@ivrm.jp', 'ivmz-contact')

    expect(email.Destination.ToAddresses).toEqual(['ivmz@ivrm.jp'])
    expect(email.FromEmailAddress).toBe('ivmz@ivrm.jp')
    expect(email.ConfigurationSetName).toBe('ivmz-contact')
    expect(email.ReplyToAddresses).toEqual(['visitor@example.com'])
    expect(email.Content.Simple.Subject.Data).toBe('[ivmz contact] Work request')
    expect(email.Content.Simple.Body.Text.Data).toContain('Hello there')
  })
})

describe('SesContactNotifier', () => {
  it('sends one SES command', async () => {
    const send = vi.fn().mockResolvedValue({})
    await new SesContactNotifier({ send } as never, 'ivmz@ivrm.jp', 'ivmz-contact').notify(message)
    expect(send).toHaveBeenCalledTimes(1)
  })
})
