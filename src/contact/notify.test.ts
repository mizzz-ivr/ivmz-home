import { describe, expect, it, vi } from 'vitest'

import {
  NoopContactNotifier,
  SesContactNotifier,
  buildAcknowledgementEmail,
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
    expect(email.Content.Simple.Subject.Data).toBe('[ivmz] Job / Work | Work request')
    expect(email.Content.Simple.Body.Text.Data).toContain('Hello there')
    expect(email.Content.Simple.Body.Html.Data).toContain('Hello there')
  })
})

describe('buildNotificationEmail details', () => {
  it('links to the CMS record and lists scanned attachments without attaching them', () => {
    const email = buildNotificationEmail(
      {
        ...message,
        attachments: [
          { contentType: 'application/pdf', filename: 'cv.pdf', key: 'k', sha256: 'h', size: 2048 },
        ],
        submissionId: 42,
      },
      'ivmz@ivrm.jp',
      'ivmz-contact',
    )
    const { Html, Text } = email.Content.Simple.Body

    expect(Text.Data).toContain('https://ivmz.ivrm.jp/admin/collections/contact-submissions/42')
    expect(Text.Data).toContain('cv.pdf')
    expect(Text.Data).toContain('メールには添付されません')
    expect(Html.Data).toContain('contact-submissions/42')
    expect(JSON.stringify(email)).not.toContain('"k"')
  })

  it('escapes visitor-controlled text in the HTML part', () => {
    const email = buildNotificationEmail(
      {
        ...message,
        message: '<script>alert(1)</script>',
        name: '<b>x</b>',
        subject: '"><img src=x onerror=alert(1)>',
      },
      'ivmz@ivrm.jp',
      'ivmz-contact',
    )
    const html = email.Content.Simple.Body.Html.Data

    expect(html).not.toContain('<script>')
    expect(html).not.toContain('<img')
    expect(html).not.toContain('<b>x</b>')
    expect(html).toContain('&lt;script&gt;')
  })
})

describe('SesContactNotifier', () => {
  it('sends one SES command', async () => {
    const send = vi.fn().mockResolvedValue({})
    await new SesContactNotifier({ send } as never, 'ivmz@ivrm.jp', 'ivmz-contact', false).notify(
      message,
    )
    expect(send).toHaveBeenCalledTimes(1)
  })
})

describe('buildAcknowledgementEmail', () => {
  it('goes to the visitor, replies to the owner and echoes nothing the visitor typed', () => {
    const email = buildAcknowledgementEmail(
      { ...message, message: 'SECRET-BODY', name: 'EVIL-NAME', subject: 'EVIL-SUBJECT' },
      'ivmz@ivrm.jp',
      'ivmz-contact',
    )

    expect(email.Destination.ToAddresses).toEqual(['visitor@example.com'])
    expect(email.ReplyToAddresses).toEqual(['ivmz@ivrm.jp'])
    const text = JSON.stringify(email)
    expect(text).toContain('request-id')
    expect(text).not.toContain('SECRET-BODY')
    expect(text).not.toContain('EVIL-NAME')
    expect(text).not.toContain('EVIL-SUBJECT')
  })
})

describe('SesContactNotifier receipt email', () => {
  it('sends the owner notification and the receipt', async () => {
    const send = vi.fn().mockResolvedValue({})
    await new SesContactNotifier({ send } as never, 'ivmz@ivrm.jp', 'ivmz-contact').notify(message)
    expect(send).toHaveBeenCalledTimes(2)
  })

  it('does not fail the notification when only the receipt fails', async () => {
    const send = vi
      .fn()
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(Object.assign(new Error('x'), { name: 'MessageRejected' }))
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(
      new SesContactNotifier({ send } as never, 'ivmz@ivrm.jp', 'ivmz-contact').notify(message),
    ).resolves.toBeUndefined()
    spy.mockRestore()
  })

  it('fails when the owner notification fails', async () => {
    const send = vi.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce({})
    await expect(
      new SesContactNotifier({ send } as never, 'ivmz@ivrm.jp', 'ivmz-contact').notify(message),
    ).rejects.toThrow('boom')
  })

  it('does not let a hung receipt delay or fail the owner notification', async () => {
    vi.useFakeTimers()
    try {
      const send = vi
        .fn()
        .mockResolvedValueOnce({})
        .mockImplementationOnce(
          (_command: unknown, options: { abortSignal?: AbortSignal }) =>
            new Promise((_, reject) => {
              options.abortSignal?.addEventListener('abort', () =>
                reject(Object.assign(new Error('aborted'), { name: 'AbortError' })),
              )
            }),
        )
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const outer = new AbortController()
      const done = new SesContactNotifier({ send } as never, 'ivmz@ivrm.jp', 'ivmz-contact').notify(
        message,
        outer.signal,
      )

      await vi.advanceTimersByTimeAsync(3_001)
      await expect(done).resolves.toBeUndefined()
      expect(outer.signal.aborted).toBe(false)
      spy.mockRestore()
    } finally {
      vi.useRealTimers()
    }
  })

  it('skips the receipt when auto-reply is off', async () => {
    const send = vi.fn().mockResolvedValue({})
    await new SesContactNotifier({ send } as never, 'ivmz@ivrm.jp', 'ivmz-contact', false).notify(
      message,
    )
    expect(send).toHaveBeenCalledTimes(1)
  })
})
