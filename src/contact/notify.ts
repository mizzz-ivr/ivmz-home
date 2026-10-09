import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2'

import { site } from '@/lib/site'

import { contactCategoryLabels } from './category-labels'
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

const oneLine = (value: string, max: number) => value.replace(/\s+/g, ' ').trim().slice(0, max)

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatBytes(bytes: number) {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`
}

function adminUrl(message: ContactDeliveryMessage) {
  return message.submissionId === undefined
    ? `${site.url}/admin/collections/contact-submissions`
    : `${site.url}/admin/collections/contact-submissions/${encodeURIComponent(String(message.submissionId))}`
}

export function buildNotificationEmail(
  message: ContactDeliveryMessage,
  from: string,
  configurationSet: string,
) {
  const category = contactCategoryLabels[message.category] ?? message.category
  const link = adminUrl(message)
  const attachments = message.attachments ?? []
  const attachmentLines = attachments.map(
    (file) => `  - ${oneLine(file.filename, 160)} (${formatBytes(file.size)})`,
  )

  const text = [
    '新しい問い合わせが届きました。',
    '',
    `カテゴリ : ${category}`,
    `件名     : ${oneLine(message.subject, 160)}`,
    `送信者   : ${oneLine(message.name, 80)} <${message.email}>`,
    `受付番号 : ${message.requestId}`,
    ...(attachments.length > 0
      ? [
          `添付     : ${attachments.length} 件（ウイルススキャン済み。メールには添付されません）`,
          ...attachmentLines,
        ]
      : []),
    '',
    '── メッセージ ──',
    message.message,
    '────────────────',
    '',
    `▶ CMS で開く（添付のダウンロードはここから・要ログイン）\n  ${link}`,
    '',
    '※ このメールに返信すると、送信者のアドレスに届きます。',
  ].join('\n')

  const row = (label: string, value: string) =>
    `<tr><th align="left" style="padding:4px 12px 4px 0;color:#6b6280;font-weight:600;white-space:nowrap;vertical-align:top">${label}</th><td style="padding:4px 0">${value}</td></tr>`

  const html = `<!doctype html><html lang="ja"><body style="margin:0;background:#f2eff8;font-family:-apple-system,'Segoe UI','Hiragino Sans',Meiryo,sans-serif;color:#1a1230">
<div style="max-width:620px;margin:0 auto;padding:20px">
<div style="background:#ffffff;border-radius:14px;padding:22px;border:1px solid #ddd6ee">
<p style="margin:0 0 4px;font-size:12px;letter-spacing:.12em;color:#6d3bd8;font-weight:700">IVMZ / CONTACT</p>
<h1 style="margin:0 0 14px;font-size:18px;line-height:1.4">${escapeHtml(oneLine(message.subject, 160))}</h1>
<table role="presentation" cellpadding="0" cellspacing="0" style="font-size:14px;line-height:1.5;width:100%">
${row('カテゴリ', escapeHtml(category))}
${row('送信者', `${escapeHtml(oneLine(message.name, 80))} &lt;<a href="mailto:${escapeHtml(message.email)}" style="color:#6d3bd8">${escapeHtml(message.email)}</a>&gt;`)}
${row('受付番号', `<code style="font-size:12px">${escapeHtml(message.requestId)}</code>`)}
${attachments.length > 0 ? row('添付', `${attachments.length} 件（スキャン済み）<br>${attachments.map((file) => `${escapeHtml(oneLine(file.filename, 160))} <span style="color:#6b6280">(${formatBytes(file.size)})</span>`).join('<br>')}`) : ''}
</table>
<div style="margin:16px 0;padding:14px 16px;background:#f7f4fd;border-left:4px solid #ffd23a;border-radius:6px;white-space:pre-wrap;font-size:14px;line-height:1.7">${escapeHtml(message.message)}</div>
<p style="margin:0 0 10px"><a href="${escapeHtml(link)}" style="display:inline-block;background:#6d3bd8;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:999px;font-weight:700;font-size:13px">CMS で開く${attachments.length > 0 ? '（添付はここから）' : ''}</a></p>
<p style="margin:0;font-size:12px;color:#6b6280">このメールに返信すると、送信者のアドレスに届きます。添付ファイルはメールに含まれません（要ログイン）。</p>
</div></div></body></html>`

  return {
    // Required so delivery / bounce / complaint events reach the monitored event destination.
    ConfigurationSetName: configurationSet,
    Destination: { ToAddresses: [message.recipient] },
    FromEmailAddress: from,
    ReplyToAddresses: [message.email],
    Content: {
      Simple: {
        Subject: {
          Charset: 'UTF-8',
          Data: `[ivmz] ${category} | ${oneLine(message.subject, 120)}`,
        },
        Body: {
          Html: { Charset: 'UTF-8', Data: html },
          Text: { Charset: 'UTF-8', Data: text },
        },
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

const RECEIPT_TIMEOUT_MS = 3_000

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

    // The owner notification decides success; a failed receipt email is only logged. The receipt has
    // its own shorter deadline so a slow receipt can never push the owner result past the budget.
    const receiptSignal = AbortSignal.any(
      signal
        ? [signal, AbortSignal.timeout(RECEIPT_TIMEOUT_MS)]
        : [AbortSignal.timeout(RECEIPT_TIMEOUT_MS)],
    )
    const [owner, receipt] = await Promise.allSettled([
      notification,
      this.client.send(
        new SendEmailCommand(buildAcknowledgementEmail(message, this.from, this.configurationSet)),
        { abortSignal: receiptSignal },
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
