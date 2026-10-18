import { beforeEach, describe, expect, it, vi } from 'vitest'

import { formatAlertText, parseWebhookUrl, resetAlertThrottle, sendOpsAlert } from './alert'

const ok = () => new Response(null, { status: 204 })

beforeEach(() => resetAlertThrottle())

describe('formatAlertText', () => {
  it('adds an icon, the title and a trimmed detail without email addresses', () => {
    const text = formatAlertText({
      detail: 'failed for visitor@example.com ' + 'x'.repeat(600),
      key: 'k',
      severity: 'critical',
      title: 'Mail failed',
    })
    expect(text.startsWith('🔴 [ivmz] Mail failed\n')).toBe(true)
    expect(text).not.toContain('visitor@example.com')
    expect(text).toContain('[email]')
    expect(text.length).toBeLessThan(600)
  })
  it('redacts email and IP from alert titles and details', () => {
    const formatted = formatAlertText({
      key: 'privacy',
      severity: 'warning',
      title: 'user@example.com 203.0.113.4',
      detail: 'source: 192.0.2.1',
    })
    expect(formatted).not.toContain('203.0.113.4')
    expect(formatted).not.toContain('192.0.2.1')
    expect(formatted).not.toContain('user@example.com')
  })
})

describe('webhook URL validation', () => {
  it('accepts only exact Slack or Discord webhook origins and paths', () => {
    expect(parseWebhookUrl('https://hooks.slack.com/services/T/B/X')).not.toBeNull()
    expect(parseWebhookUrl('https://discord.com/api/webhooks/123/token')).not.toBeNull()
    for (const invalid of [
      'https://127.0.0.1/services/T/B/X',
      'https://discord.com.evil.example/api/webhooks/123/token',
      'https://notdiscord.com/api/webhooks/123/token',
      'https://example.com/api/webhooks/123/token',
      'https://hooks.slack.com.evil.example/services/T/B/X',
      'https://discord.com@internal.example/api/webhooks/123/token',
      'https://discord.com/robots.txt',
      'https://hooks.slack.com/services/T/B/X?next=1',
      'https://discord.com:8443/api/webhooks/123/token',
      'http://discord.com/api/webhooks/123/token',
      'https://metadata.google.internal/',
    ]) {
      expect(parseWebhookUrl(invalid)).toBeNull()
    }
  })
})

describe('sendOpsAlert', () => {
  const alert = { key: 'a', severity: 'warning' as const, title: 'T' }

  it('does nothing without a webhook or outside production', async () => {
    const fetcher = vi.fn(ok) as unknown as typeof fetch
    expect(await sendOpsAlert(alert, { fetcher, production: true, webhookUrl: undefined })).toBe(
      'skipped',
    )
    expect(
      await sendOpsAlert(alert, {
        fetcher,
        production: false,
        webhookUrl: 'https://discord.com/api/webhooks/1/x',
      }),
    ).toBe('skipped')
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('refuses non-https webhooks and urls with credentials', async () => {
    const fetcher = vi.fn(ok) as unknown as typeof fetch
    for (const webhookUrl of ['http://example.com/hook', 'https://u:p@example.com/hook', 'nope']) {
      expect(await sendOpsAlert(alert, { fetcher, production: true, webhookUrl })).toBe('skipped')
    }
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('posts a Discord body to discord webhooks and a Slack body to Slack', async () => {
    const calls: Array<{ body: Record<string, unknown>; url: string }> = []
    const fetcher = vi.fn(async (url: URL, init: RequestInit) => {
      expect(init.redirect).toBe('error')
      calls.push({ body: JSON.parse(String(init.body)), url: String(url) })
      return ok()
    }) as unknown as typeof fetch

    await sendOpsAlert(
      { ...alert, key: 'd' },
      { fetcher, production: true, webhookUrl: 'https://discord.com/api/webhooks/1/x' },
    )
    await sendOpsAlert(
      { ...alert, key: 's' },
      { fetcher, production: true, webhookUrl: 'https://hooks.slack.com/services/T/B/X' },
    )
    expect(calls[0].body).toHaveProperty('content')
    expect(calls[0].body).not.toHaveProperty('text')
    expect(calls[1].body).toHaveProperty('text')
  })

  it('throttles repeats of the same key and reports failures without throwing', async () => {
    let time = 1_000
    const fetcher = vi.fn(ok) as unknown as typeof fetch
    const base = {
      fetcher,
      now: () => time,
      production: true,
      webhookUrl: 'https://discord.com/api/webhooks/1/x',
    }
    expect(await sendOpsAlert(alert, base)).toBe('sent')
    expect(await sendOpsAlert(alert, base)).toBe('throttled')
    time += 11 * 60 * 1000
    expect(await sendOpsAlert(alert, base)).toBe('sent')

    const broken = vi.fn(async () => {
      throw new Error('network')
    }) as unknown as typeof fetch
    expect(await sendOpsAlert({ ...alert, key: 'b' }, { ...base, fetcher: broken })).toBe('failed')
    // A failed delivery must not start the throttle window: the retry goes out.
    expect(await sendOpsAlert({ ...alert, key: 'b' }, base)).toBe('sent')
    expect(await sendOpsAlert({ ...alert, key: 'b' }, base)).toBe('throttled')
  })
})
