// @vitest-environment node
import { randomUUID } from 'node:crypto'

import { sql } from '@payloadcms/db-postgres'
import type { Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import { anonymousClientDigest, PayloadAnonymousMessageStore } from './store'

// The normal unit-test pass precedes migrations and skips this suite.
// CI explicitly enables it after migrating an isolated PostgreSQL 17 service.
describe.skipIf(process.env.ANONYMOUS_DB_INTEGRATION !== 'true')(
  'anonymous message integration against PostgreSQL 17',
  () => {
    let payload: Payload
    let store: PayloadAnonymousMessageStore

    beforeAll(async () => {
      const [{ getPayload }, { default: config }] = await Promise.all([
        import('payload'),
        import('../payload.config'),
      ])
      payload = await getPayload({ config })
      store = new PayloadAnonymousMessageStore()
    }, 30_000)

    it('limits concurrent attempts and resets an expired window', async () => {
      const secret = `ci-anonymous-db-hmac-${randomUUID()}`
      const request = new Request('https://ivmz.ivrm.jp/api/message', {
        headers: { 'x-nf-client-connection-ip': '198.51.100.91' },
      })
      const key = anonymousClientDigest(request, secret)
      expect(key).toMatch(/^[a-f0-9]{64}$/)

      try {
        const attempts = await Promise.all(
          Array.from({ length: 12 }, () => store.consume(request, secret)),
        )
        expect(attempts.filter(Boolean)).toHaveLength(5)
        expect(attempts.filter((allowed) => !allowed)).toHaveLength(7)

        const current = await payload.db.drizzle.execute(sql`
          SELECT "attempts" FROM "ivmz_home"."anonymous_message_rate_limits"
          WHERE "key" = ${key}
        `)
        expect(Number(current.rows[0]?.attempts)).toBe(12)

        await payload.db.drizzle.execute(sql`
          UPDATE "ivmz_home"."anonymous_message_rate_limits"
          SET "expires_at" = NOW() - INTERVAL '1 second' WHERE "key" = ${key}
        `)
        expect(await store.consume(request, secret)).toBe(true)

        const renewed = await payload.db.drizzle.execute(sql`
          SELECT "attempts" FROM "ivmz_home"."anonymous_message_rate_limits"
          WHERE "key" = ${key}
        `)
        expect(Number(renewed.rows[0]?.attempts)).toBe(1)
      } finally {
        await payload.db.drizzle.execute(sql`
          DELETE FROM "ivmz_home"."anonymous_message_rate_limits" WHERE "key" = ${key}
        `)
      }
    }, 30_000)

    it('stores one private submission under concurrent identical idempotency retries', async () => {
      const requestId = randomUUID()
      const input = { requestId, message: '並列POSTの冪等性を検証' }

      try {
        const outcomes = await Promise.all(Array.from({ length: 6 }, () => store.save(input)))
        expect(outcomes.filter((outcome) => outcome === 'created')).toHaveLength(1)
        expect(outcomes.filter((outcome) => outcome === 'duplicate')).toHaveLength(5)

        const stored = await payload.find({
          collection: 'anonymous-messages',
          overrideAccess: true,
          depth: 0,
          where: { requestId: { equals: requestId } },
        })
        expect(stored.docs).toHaveLength(1)
        expect(stored.docs[0]?.message).toBe(input.message)
        expect(stored.docs[0]?.isPublic).toBe(false)
        expect(stored.docs[0]?.status).toBe('new')

        expect(await store.save({ requestId, message: '別の本文' })).toBe('conflict')
      } finally {
        await payload.db.drizzle.execute(sql`
          DELETE FROM "ivmz_home"."anonymous_messages" WHERE "request_id" = ${requestId}
        `)
      }
    }, 30_000)
  },
)
