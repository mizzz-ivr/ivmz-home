import { clientKey } from '@/contact/attachments/rate-limit'

type Counter = { count: number; resetAt: number }

const MAX_TRACKED = 2_000
const counters = new Map<string, Counter>()
// Kept out of the visitor map so evicting visitor buckets can never reset the shared allowance.
const daily: Counter = { count: 0, resetAt: 0 }

export const CHAT_IP_LIMIT = 8
export const CHAT_IP_WINDOW_MS = 10 * 60_000
/** Stays well under the Workers AI free allowance (10,000 neurons a day, about 100+ requests). */
export const CHAT_DAILY_LIMIT = 80
const DAY_MS = 24 * 60 * 60_000

function hitDaily(now: number): boolean {
  if (daily.resetAt <= now) {
    daily.count = 1
    daily.resetAt = now + DAY_MS
    return true
  }
  if (daily.count >= CHAT_DAILY_LIMIT) return false
  daily.count += 1
  return true
}

function hit(key: string, limit: number, windowMs: number, now: number): boolean {
  const current = counters.get(key)
  if (!current || current.resetAt <= now) {
    if (counters.size >= MAX_TRACKED) {
      for (const [stale, value] of counters) if (value.resetAt <= now) counters.delete(stale)
      if (counters.size >= MAX_TRACKED) {
        const oldest = counters.keys().next().value
        if (oldest !== undefined) counters.delete(oldest)
      }
    }
    counters.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (current.count >= limit) return false
  current.count += 1
  return true
}

/**
 * Best-effort limits per serverless instance: a per-visitor window and a global daily cap. The
 * provider's own free quota is the hard backstop (it errors instead of billing on the free plan),
 * and every failure falls back to the built-in FAQ answers.
 */
export function allowChatRequest(request: Request, now = Date.now()): 'ok' | 'visitor' | 'daily' {
  // Visitor first: requests rejected here must not spend the shared daily allowance.
  if (!hit(`ip:${clientKey(request)}`, CHAT_IP_LIMIT, CHAT_IP_WINDOW_MS, now)) return 'visitor'
  if (!hitDaily(now)) return 'daily'
  return 'ok'
}

export function resetChatLimitsForTests() {
  counters.clear()
  daily.count = 0
  daily.resetAt = 0
}
