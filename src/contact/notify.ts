import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2'

import type { ContactDeliveryMessage } from './delivery'

export interface ContactNotifier {
  readonly kind: string
  /** `signal` aborts the in-flight provider request when the delivery budget runs out. */
  notify(message: ContactDeliveryMessage, signal?: AbortSignal): Promise<void>
}

/** Used until SES is configured; the submission is already stored, so nothing is lost. */
export class NoopContactNotifier implements ContactNotifier {
  readonly kind = 'none'

  async notify(): Promise<void> {}
}

type SesEnvironment = {
  CONTACT_FROM_EMAIL?: string
  CONTACT_SES_CONFIGURATION_SET?: string
  CONTACT_SES_ACCESS_KEY_ID?: string
  CONTACT_SES_REGION?: string
  CONTACT_SES_SECRET_ACCESS_KEY?: string
  /** Set to `off` to stop sending the receipt email to the visitor. */
  CONTACT_AUTOREPLY?: string
}

export function buildNotificationEmail(
  message: ContactDeliveryMessage,
  from: string,
  configurationSet: string,
) {
  const body = [
    `Category: ${message.category}`,
    `From: ${message.name} <${message.email}>`,
    `Request ID: ${message.requestId}`,
    ...(message.attachments?.length
      ? [
          `Attachments: ${message.attachments.length} (scanned; open them from the CMS inbox, not attached here)`,
        ]
      : []),
    '',
    message.message,
    '',
    '— Stored in the ivmz CMS inbox (/admin → Inbox). Reply to this email to answer the sender.',
  ].join('\n')

  return {
    // Required so delivery / bounce / complaint events reach the monitored event destination.
    ConfigurationSetName: configurationSet,
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

/**
 * Receipt email for the visitor. It deliberately contains only fixed text and the receipt id:
 * nothing the visitor typed is echoed back, so the form cannot be used to mail arbitrary content
 * to a third party's address.
 */
export function buildAcknowledgementEmail(
  message: ContactDeliveryMessage,
  from: string,
  configurationSet: string,
) {
  const body = [
    'お問い合わせありがとうございます。メッセージを受け付けました。',
    '',
    `受付番号: ${message.requestId}`,
    '',
    '内容を確認のうえ、返信が必要な場合は、このメールに返信する形でご連絡します。',
    'しばらくお待ちください。',
    '',
    '※このメールはフォーム送信時に自動で送られています。',
    '　心当たりがない場合は、このメールを破棄してください。',
    '',
    '— ivmz (https://ivmz.ivrm.jp)',
    '',
    '---',
    'Thanks for your message. It has been received (reference above).',
    'If a reply is needed, I will answer by replying to this email.',
    'If you did not submit the form, please ignore this message.',
  ].join('\n')

  return {
    ConfigurationSetName: configurationSet,
    Destination: { ToAddresses: [message.email] },
    FromEmailAddress: from,
    ReplyToAddresses: [message.recipient],
    Content: {
      Simple: {
        Subject: {
          Charset: 'UTF-8',
          Data: '[ivmz] お問い合わせを受け付けました / Message received',
        },
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
    private readonly configurationSet: string,
    private readonly autoReply = true,
  ) {}

  async notify(message: ContactDeliveryMessage, signal?: AbortSignal): Promise<void> {
    const options = { abortSignal: signal }
    const notification = this.client.send(
      new SendEmailCommand(buildNotificationEmail(message, this.from, this.configurationSet)),
      options,
    )

    if (!this.autoReply) {
      await notification
      return
    }

    // The owner notification decides success; a failed receipt email is only logged.
    const [owner, receipt] = await Promise.allSettled([
      notification,
      this.client.send(
        new SendEmailCommand(buildAcknowledgementEmail(message, this.from, this.configurationSet)),
        options,
      ),
    ])
    if (receipt.status === 'rejected') {
      console.error(
        'CONTACT_ACK_FAILED',
        JSON.stringify({
          error: receipt.reason instanceof Error ? receipt.reason.name : 'UnknownError',
          requestId: message.requestId,
        }),
      )
    }
    if (owner.status === 'rejected') throw owner.reason
  }
}

/** Enabled only when the dedicated CONTACT_* variables are all present. */
export function createContactNotifier(
  env: SesEnvironment = {
    CONTACT_FROM_EMAIL: process.env.CONTACT_FROM_EMAIL,
    CONTACT_SES_CONFIGURATION_SET: process.env.CONTACT_SES_CONFIGURATION_SET,
    CONTACT_SES_ACCESS_KEY_ID: process.env.CONTACT_SES_ACCESS_KEY_ID,
    CONTACT_SES_REGION: process.env.CONTACT_SES_REGION,
    CONTACT_SES_SECRET_ACCESS_KEY: process.env.CONTACT_SES_SECRET_ACCESS_KEY,
    CONTACT_AUTOREPLY: process.env.CONTACT_AUTOREPLY,
  },
): ContactNotifier {
  const {
    CONTACT_FROM_EMAIL,
    CONTACT_SES_ACCESS_KEY_ID,
    CONTACT_SES_CONFIGURATION_SET,
    CONTACT_SES_REGION,
  } = env
  const secret = env.CONTACT_SES_SECRET_ACCESS_KEY

  if (
    !CONTACT_FROM_EMAIL ||
    !CONTACT_SES_ACCESS_KEY_ID ||
    !CONTACT_SES_CONFIGURATION_SET ||
    !CONTACT_SES_REGION ||
    !secret
  ) {
    return new NoopContactNotifier()
  }

  const client = new SESv2Client({
    credentials: { accessKeyId: CONTACT_SES_ACCESS_KEY_ID, secretAccessKey: secret },
    region: CONTACT_SES_REGION,
  })
  return new SesContactNotifier(
    client,
    CONTACT_FROM_EMAIL,
    CONTACT_SES_CONFIGURATION_SET,
    env.CONTACT_AUTOREPLY !== 'off',
  )
}
