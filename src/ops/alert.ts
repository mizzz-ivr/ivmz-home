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
  const detail = (alert.detail ?? '').replace(EMAIL_LIKE, '[email]').slice(0, MAX_DETAIL)
  const head = `${ICON[alert.severity]} [ivmz] ${alert.title}`
  return detail ? `${head}\n${detail}` : head
}

function payloadFor(url: URL, text: string) {
  if (url.hostname === 'hooks.slack.com') return { text }
  if (url.hostname.endsWith('discord.com') || url.hostname.endsWith('discordapp.com')) {
    return { content: text, username: 'ivmz ops' }
  }
  return { content: text, text }
}

export async function sendOpsAlert(
  alert: OpsAlert,
  dependencies: Dependencies = {},
): Promise<OpsAlertResult> {
  const webhookUrl =
    'webhookUrl' in dependencies ? dependencies.webhookUrl : process.env.OPS_ALERT_WEBHOOK_URL
  const production = dependencies.production ?? isProductionRuntime()
  if (!webhookUrl || !production) return 'skipped'

  let url: URL
  try {
    url = new URL(webhookUrl)
  } catch {
    return 'skipped'
  }
  if (url.protocol !== 'https:' || url.username || url.password) return 'skipped'

  const now = (dependencies.now ?? Date.now)()
  const previous = lastSent.get(alert.key)
  if (previous !== undefined && now - previous < THROTTLE_MS) return 'throttled'
  lastSent.set(alert.key, now)

  try {
    const response = await (dependencies.fetcher ?? fetch)(url, {
      body: JSON.stringify(payloadFor(url, formatAlertText(alert))),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    return response.ok ? 'sent' : 'failed'
  } catch {
    return 'failed'
  }
}

/** Test helper: forget the throttle state. */
export function resetAlertThrottle() {
  lastSent.clear()
}
