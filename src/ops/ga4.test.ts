import { generateKeyPairSync } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'

import { fetchGA4Summary } from './ga4'

const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
const env = {
  GA4_PROPERTY_ID: '123456789',
  GA4_SERVICE_ACCOUNT_JSON: JSON.stringify({
    client_email: 'viewer@test.iam.gserviceaccount.com',
    private_key: privateKey.export({ format: 'pem', type: 'pkcs8' }).toString(),
  }),
}

describe('GA4 server-only aggregate reader', () => {
  it('does not call a provider if unset or malformed', async () => {
    const fetcher = vi.fn() as unknown as typeof fetch
    expect(await fetchGA4Summary({}, fetcher)).toEqual({ state: 'not-configured' })
    expect(await fetchGA4Summary({ ...env, GA4_PROPERTY_ID: '../foo' }, fetcher)).toEqual({
      state: 'not-configured',
    })
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('reads aggregate counts but hides private paths and credentials', async () => {
    const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input)
      if (url.includes('oauth2.googleapis.com')) {
        expect(String(init?.body)).not.toContain('PRIVATE KEY')
        return Response.json({ access_token: 'short-lived-token' })
      }
      expect((init?.headers as Record<string, string>).Authorization).toBe(
        'Bearer short-lived-token',
      )
      const body = JSON.parse(String(init?.body)) as { dimensions?: Array<{ name: string }> }
      if (body.dimensions) {
        return Response.json({
          rows: [
            { dimensionValues: [{ value: '/works/project' }], metricValues: [{ value: '13' }] },
            { dimensionValues: [{ value: '/contact' }], metricValues: [{ value: '8' }] },
            { dimensionValues: [{ value: '//evil.example' }], metricValues: [{ value: '7' }] },
          ],
        })
      }
      return Response.json({
        rows: [{ metricValues: [{ value: '9' }, { value: '21' }] }],
      })
    }) as unknown as typeof fetch

    const result = await fetchGA4Summary(env, fetcher)
    expect(result).toEqual({
      state: 'ok',
      last7d: { activeUsers: 9, views: 21 },
      last30d: { activeUsers: 9, views: 21 },
      topPages: [{ path: '/works/project', views: 13 }],
    })
    expect(fetcher).toHaveBeenCalledTimes(4)
  })

  it('degrades without exposing tokens on Google errors', async () => {
    const fetcher = vi.fn(async () => new Response('down', { status: 503 })) as unknown as typeof fetch
    expect(await fetchGA4Summary(env, fetcher)).toEqual({ state: 'unavailable' })
  })
})
