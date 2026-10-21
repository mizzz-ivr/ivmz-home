import assert from 'node:assert/strict'
import test from 'node:test'

import { publicReleaseProbes, verifyProductionReadOnly } from './verify-production-readonly.mjs'

function mockResponse(path, override = {}) {
  const probe = publicReleaseProbes.find((item) => item.path === path)
  assert.ok(probe)
  const status = override.status ?? probe.status[0]
  const headers = new Headers({
    'content-type': probe.mime === 'xml' ? 'application/xml' : (probe.mime ?? 'text/plain'),
    'content-security-policy-report-only': "default-src 'self'",
    'cache-control': 'private, no-store',
    'x-robots-tag': 'noindex',
    ...override.headers,
  })
  if (probe.admin && status >= 300 && status < 400) headers.set('location', '/admin/login')
  return new Response(probe.docs ? JSON.stringify(override.json ?? { docs: [] }) : '', { status, headers })
}

function requester(overrides = {}) {
  const observed = []
  return {
    observed,
    request: async (url, options) => {
      observed.push({ url, options })
      const path = url.pathname + url.search
      return mockResponse(path, overrides[path] ?? {})
    },
  }
}

test('all release probes are GET-only, unauthenticated, same-origin and do not follow redirects', async () => {
  const { observed, request } = requester()
  const results = await verifyProductionReadOnly({ request })
  assert.equal(results.length, publicReleaseProbes.length)
  for (const item of observed) {
    assert.equal(item.url.origin, 'https://ivmz.ivrm.jp')
    assert.equal(item.options.method, 'GET')
    assert.equal(item.options.redirect, 'manual')
    assert.equal(item.options.credentials, 'omit')
    assert.equal('body' in item.options, false)
    assert.equal('headers' in item.options, false)
  }
})

test('private operations endpoint is never called with a credential or POST', async () => {
  const { observed, request } = requester()
  await verifyProductionReadOnly({ request })
  const ops = observed.find((item) => item.url.pathname === '/api/ops/health')
  assert.equal(ops?.options.method, 'GET')
  assert.equal(ops?.url.search, '')
})

test('reports 500 without printing a response body', async () => {
  const { request } = requester({
    '/contact': { status: 500 },
  })
  await assert.rejects(
    verifyProductionReadOnly({ request }),
    /Release smoke failed at \/contact: unexpected HTTP status 500/,
  )
})

test('rejects cross-origin redirects from admin and unexpected redirects on public pages', async () => {
  const external = requester({
    '/admin': { status: 302, headers: { location: 'https://attacker.invalid/steal' } },
  })
  await assert.rejects(
    verifyProductionReadOnly({ request: external.request }),
    /cross-origin redirect/,
  )

  const extra = requester({ '/works': { status: 302 } })
  await assert.rejects(verifyProductionReadOnly({ request: extra.request }), /unexpected HTTP status 302/)
})

test('rejects missing CSP, enforcing CSP, uncacheable flags and malformed JSON', async () => {
  const noCsp = requester({ '/': { headers: { 'content-security-policy-report-only': '' } } })
  await assert.rejects(verifyProductionReadOnly({ request: noCsp.request }), /CSP Report-Only missing/)

  const enforced = requester({ '/': { headers: { 'content-security-policy': "default-src 'self'" } } })
  await assert.rejects(verifyProductionReadOnly({ request: enforced.request }), /unexpected enforcing CSP/)

  const noCache = requester({ '/api/ops/health': { headers: { 'cache-control': 'public' } } })
  await assert.rejects(verifyProductionReadOnly({ request: noCache.request }), /no-store missing/)

  const badDocs = requester({ '/api/works?limit=1&depth=0': { json: { count: 5 } } })
  await assert.rejects(verifyProductionReadOnly({ request: badDocs.request }), /shape mismatch/)
})
