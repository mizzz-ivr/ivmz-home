import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2'

import type { ContactDeliveryMessage } from './delivery'

export interface ContactNotifier {
  readonly kind: string
  notify(message: ContactDeliveryMessage): Promise<void>
}

/** Used until SES is configured; the submission is already stored, so nothing is lost. */
export class NoopContactNotifier implements ContactNotifier {
  readonly kind = 'none'

  async notify(): Promise<void> {}
}

type SesEnvironment = {
  CONTACT_FROM_EMAIL?: string
  CONTACT_SES_ACCESS_KEY_ID?: string
  CONTACT_SES_REGION?: string
  CONTACT_SES_SECRET_ACCESS_KEY?: string
}

export function buildNotificationEmail(message: ContactDeliveryMessage, from: string) {
  const body = [
    `Category: ${message.category}`,
    `From: ${message.name} <${message.email}>`,
    `Request ID: ${message.requestId}`,
    '',
    message.message,
    '',
    '— Stored in the ivmz CMS inbox (/admin → Inbox). Reply to this email to answer the sender.',
  ].join('\n')

  return {
    Destination: { ToAddresses: [message.recipient] },
    FromEmailAddress: from,
    ReplyToAddresses: [message.email],
    Content: {
      Simple: {
        Subject: { Charset: 'UTF-8', Data: `[ivmz contact] ${message.subject}` },
        Body: { Text: { Charset: 'UTF-8', Data: body } },
      },
    },
  }
}

export class SesContactNotifier implements ContactNotifier {
  readonly kind = 'ses'

  constructor(
    private readonly client: Pick<SESv2Client, 'send'>,
    private readonly from: string,
  ) {}

  async notify(message: ContactDeliveryMessage): Promise<void> {
    await this.client.send(new SendEmailCommand(buildNotificationEmail(message, this.from)))
  }
}

/** Enabled only when the dedicated CONTACT_* variables are all present. */
export function createContactNotifier(
  env: SesEnvironment = {
    CONTACT_FROM_EMAIL: process.env.CONTACT_FROM_EMAIL,
    CONTACT_SES_ACCESS_KEY_ID: process.env.CONTACT_SES_ACCESS_KEY_ID,
    CONTACT_SES_REGION: process.env.CONTACT_SES_REGION,
    CONTACT_SES_SECRET_ACCESS_KEY: process.env.CONTACT_SES_SECRET_ACCESS_KEY,
  },
): ContactNotifier {
  const { CONTACT_FROM_EMAIL, CONTACT_SES_ACCESS_KEY_ID, CONTACT_SES_REGION } = env
  const secret = env.CONTACT_SES_SECRET_ACCESS_KEY

  if (!CONTACT_FROM_EMAIL || !CONTACT_SES_ACCESS_KEY_ID || !CONTACT_SES_REGION || !secret) {
    return new NoopContactNotifier()
  }

  const client = new SESv2Client({
    credentials: { accessKeyId: CONTACT_SES_ACCESS_KEY_ID, secretAccessKey: secret },
    region: CONTACT_SES_REGION,
  })
  return new SesContactNotifier(client, CONTACT_FROM_EMAIL)
}
