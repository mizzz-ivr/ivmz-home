import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

import { fetchRetentionSummary } from './ops-retention-report.mjs'

const siteURL = 'https://ivmz.ivrm.jp'
const token = 'ci-example-secret-longer-than-24-characters'
const goodReport = { days: 365, dryRun: true, eligible: 4, willDeleteNow: 4 }

function response(body = goodReport, status = 200) {
  return Response.json(body, { status })
}

test('uses only POST dry-run with the canonical Production URL and no redirects', async () => {
  let called = 0
  const result = await fetchRetentionSummary({
    siteURL,
    token,
    request: async (url, options) => {
      called += 1
      assert.equal(url.href, 'https://ivmz.ivrm.jp/api/ops/retention')
      assert.equal(options.method, 'POST')
      assert.equal(options.body, '{}')
      assert.equal(options.redirect, 'error')
      assert.equal(options.headers.authorization, `Bearer ${token}`)
      assert.equal(options.headers['content-type'], 'application/json')
      return response()
    },
  })
  assert.equal(called, 1)
  assert.deepEqual(result, { days: 365, eligible: 4, willDeleteNow: 4 })
})

test('requires a configured token before any network call', async () => {
  for (const badToken of [undefined, '', 'short']) {
    await assert.rejects(
      () =>
        fetchRetentionSummary({
          siteURL,
          token: badToken,
          request: () => {
            throw new Error('should not send a request')
          },
        }),
      /OPS_HEALTH_TOKEN is missing or invalid/,
    )
  }
})

test('fails closed on untrusted or modified destinations', async () => {
  for (const value of [
    'http://ivmz.ivrm.jp',
    'https://ivmz.ivrm.jp.evil.invalid',
    'https://another.example',
    'https://user:pass@ivmz.ivrm.jp',
    'https://ivmz.ivrm.jp/other',
    'https://ivmz.ivrm.jp/?target=evil',
    'not a URL',
  ]) {
    await assert.rejects(
      () =>
        fetchRetentionSummary({
          siteURL: value,
          token,
          request: () => {
            throw new Error('should not send a request')
          },
        }),
      /Retention (must target|site URL is invalid)/,
    )
  }
})

test('404, 401, 403 and 5xx are failures without response body leakage', async () => {
  const secret = 'sensitive-customer-content'
  for (const status of [401, 403, 404, 500, 503]) {
    const body = `<html>${secret}</html>`
    await assert.rejects(
      () =>
        fetchRetentionSummary({
          siteURL,
          token,
          request: async () =>
            new Response(body, { status, headers: { 'content-type': 'text/html' } }),
        }),
      (error) => {
        assert.match(error.message, new RegExp(String(status)))
        assert.ok(!error.message.includes(secret))
        assert.ok(!error.message.includes(token))
        return true
      },
    )
  }
})

test('network failures never expose token, URL, or raw exception messages', async () => {
  const secret = 'sensitive-customer-content'
  await assert.rejects(
    () =>
      fetchRetentionSummary({
        siteURL,
        token,
        request: async () => {
          throw new Error(`${secret} ${token}`)
        },
      }),
    (error) => {
      assert.match(error.message, /network, timeout, or redirect/)
      assert.ok(!error.message.includes(secret))
      assert.ok(!error.message.includes(token))
      return true
    },
  )
})

test('rejects non-json responses and malformed dry-run payloads', async () => {
  const invalid = [
    { ...goodReport, dryRun: false },
    { ...goodReport, dryRun: undefined },
    { ...goodReport, eligible: -1 },
    { ...goodReport, eligible: '4' },
    { ...goodReport, eligible: 2, willDeleteNow: 3 },
    { ...goodReport, willDeleteNow: 201 },
    { ...goodReport, days: 0 },
    { ...goodReport, days: 1_826 },
  ]
  for (const payload of invalid) {
    await assert.rejects(
      () => fetchRetentionSummary({ siteURL, token, request: async () => response(payload) }),
      /invalid dry-run summary/,
    )
  }
  await assert.rejects(
    () =>
      fetchRetentionSummary({
        siteURL,
        token,
        request: async () => new Response('<html>error</html>', { status: 200 }),
      }),
    /unexpected content type/,
  )
  await assert.rejects(
    () =>
      fetchRetentionSummary({
        siteURL,
        token,
        request: async () =>
          new Response('not-json', {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
      }),
    /invalid JSON/,
  )
})

test('a future successful purge response is not accepted as a report', async () => {
  await assert.rejects(
    () =>
      fetchRetentionSummary({
        siteURL,
        token,
        request: async () =>
          response({ days: 365, dryRun: false, deleted: 1, failed: 0, remaining: 0 }),
      }),
    /invalid dry-run summary/,
  )
})

test('scheduled retention remains dry-run-only even when GitHub variables are present', () => {
  const workflow = readFileSync(
    new URL('../.github/workflows/ops-health.yml', import.meta.url),
    'utf8',
  )
  const retentionJob = workflow.split('\n  retention:\n')[1]

  assert.ok(retentionJob, 'retention job must remain explicitly defined')
  assert.match(retentionJob, /run: node scripts\/ops-retention-report\.mjs/)
  assert.doesNotMatch(retentionJob, /RETENTION_APPLY|RETENTION_PURGE_ENABLED/)
  assert.doesNotMatch(retentionJob, /apply:\s*true|--data|--request\s+DELETE/)
})
