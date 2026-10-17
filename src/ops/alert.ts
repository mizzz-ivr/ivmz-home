/**
 * Operational alerts to a chat webhook (Discord or Slack compatible). Best effort by design: it
 * never throws, never blocks a visitor request for long, and only runs on the production deploy.
 * Callers must pass text that contains no personal data (no names, emails or message bodies).
 */
import { isProductionRuntime } from './env'

export type OpsAlertSeverity = 'info' | 'warning' | 'critical'

export type OpsAlert = {
  /** Stable key used to throttle repeats of the same alert. */
  key: string
  severity: OpsAlertSeverity
  title: string
  detail?: string
}

export type OpsAlertResult = 'sent' | 'skipped' | 'throttled' | 'failed'

type Dependencies = {
  fetcher?: typeof fetch
  now?: () => number
  production?: boolean
  webhookUrl?: string | undefined
}

const TIMEOUT_MS = 2_500
const THROTTLE_MS = 10 * 60 * 1000
const MAX_DETAIL = 400
const EMAIL_LIKE = /[^\s@]+@[^\s@]+\.[^\s@]+/g
const IPV4_LIKE = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g
const MAX_TITLE = 120

// Best-effort throttle: the state lives in this serverless instance only, so a burst that fans out
// over several instances can still produce a few duplicate messages. That is acceptable for the
// traffic of this site; a shared store would need its own table for no real benefit.
const lastSent = new Map<string, number>()

const ICON: Record<OpsAlertSeverity, string> = {
  critical: '🔴',
  info: '🔵',
  warning: '🟠',
}

export function formatAlertText(alert: OpsAlert): string {
  const scrub = (value: string) =>
    value.replace(EMAIL_LIKE, '[email]').replace(IPV4_LIKE, '[ip]').replace(/[\r\n\t]/g, ' ')
  const detail = scrub(alert.detail ?? '').slice(0, MAX_DETAIL)
  const head = `${ICON[alert.severity]} [ivmz] ${scrub(alert.title).slice(0, MAX_TITLE)}`
  return detail ? `${head}\n${detail}` : head
}

function payloadFor(url: URL, text: string) {
  if (url.hostname === 'hooks.slack.com') return { text }
  return { content: text, username: 'ivmz ops' }
}

/** Only the documented Discord and Slack webhook endpoints can receive server-side alerts. */
export function parseWebhookUrl(value: string | undefined): URL | null {
  if (!value) return null
  try {
    const url = new URL(value)
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.port ||
      url.search ||
      url.hash
    ) {
      return null
    }
    if (url.hostname === 'hooks.slack.com') {
      const isValidPath = /^\/services\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+$/.test(
        url.pathname,
      )
      return isValidPath ? url : null
    }
    if (url.hostname === 'discord.com' || url.hostname === 'discordapp.com') {
      const isValidPath = /^\/api(?:\/v\d+)?\/webhooks\/\d+\/[A-Za-z0-9._-]+$/.test(
        url.pathname,
      )
      return isValidPath ? url : null
    }
    return null
  } catch {
    return null
  }
}

export async function sendOpsAlert(
  alert: OpsAlert,
  dependencies: Dependencies = {},
): Promise<OpsAlertResult> {
  const webhookUrl =
    'webhookUrl' in dependencies ? dependencies.webhookUrl : process.env.OPS_ALERT_WEBHOOK_URL
  const production = dependencies.production ?? isProductionRuntime()
  if (!webhookUrl || !production) return 'skipped'

  const url = parseWebhookUrl(webhookUrl)
  if (!url) return 'skipped'

  const now = (dependencies.now ?? Date.now)()
  const previous = lastSent.get(alert.key)
  if (previous !== undefined && now - previous < THROTTLE_MS) return 'throttled'
  lastSent.set(alert.key, now)

  try {
    const response = await (dependencies.fetcher ?? fetch)(url, {
      body: JSON.stringify(payloadFor(url, formatAlertText(alert))),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
      redirect: 'error',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (response.ok) return 'sent'
  } catch {
    // fall through: an undelivered alert must not suppress the next attempt
  }
  // Give the slot back so a retry within the window is allowed after a failed delivery.
  if (previous === undefined) lastSent.delete(alert.key)
  else lastSent.set(alert.key, previous)
  return 'failed'
}

/** Test helper: forget the throttle state. */
export function resetAlertThrottle() {
  lastSent.clear()
}
