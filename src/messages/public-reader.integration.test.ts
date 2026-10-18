// @vitest-environment node
import { randomUUID } from 'node:crypto'

import { sql } from '@payloadcms/db-postgres'
import { describe, expect, it, vi } from 'vitest'

import { changeAnonymousPublication } from './publication-admin'
import { readApprovedAnonymousMessage } from './public-reader'

// This suite inserts and removes test records; run it only in ephemeral CI PostgreSQL.
function assertIsolatedDatabase() {
  const databaseUrl = new URL(process.env.DATABASE_URL ?? 'postgresql://invalid')
  if (
    process.env.CI !== 'true' ||
    databaseUrl.hostname !== '127.0.0.1' ||
    databaseUrl.port !== '5432' ||
    databaseUrl.pathname !== '/ivmz_home'
  ) {
    throw new Error('Anonymous public reader integration requires isolated CI PostgreSQL')
  }
}

describe.skipIf(process.env.ANONYMOUS_PUBLIC_READER_DB_INTEGRATION !== 'true')(
  'anonymous sharing lifecycle against PostgreSQL 17',
  () => {
    it('hides unpublished records, revokes prior IDs, and never exposes internal fields', async () => {
      assertIsolatedDatabase()
      const [{ getPayload }, { default: config }] = await Promise.all([
        import('payload'),
        import('../payload.config'),
      ])
      const payload = await getPayload({ config })
      const requestId = randomUUID()
      const doc = await payload.create({
        collection: 'anonymous-messages',
        overrideAccess: true,
        data: {
          requestId,
          message: '公開共有テスト',
          status: 'new',
          isPublic: false,
          internalNote: 'private-review-note',
        },
      })

      const actorId = 1
      const neverPublishedId = 'abcdefghijklmnopqrstuvwxyz'
      try {
        vi.stubEnv('ANONYMOUS_MESSAGE_PUBLIC_PAGES_ENABLED', 'true')
        expect(await readApprovedAnonymousMessage(neverPublishedId)).toBeNull()

        await payload.update({
          collection: 'anonymous-messages',
          overrideAccess: true,
          id: doc.id,
          data: { status: 'replied', reply: '公開した返信' },
        })

        const first = await changeAnonymousPublication(payload, doc.id, actorId, 'publish')
        expect(first.publicId).toMatch(/^[A-Za-z0-9_-]{22}$/)
        const firstId = first.publicId!
        vi.stubEnv('ANONYMOUS_MESSAGE_PUBLIC_PAGES_ENABLED', 'false')
        expect(await readApprovedAnonymousMessage(firstId)).toBeNull()

        vi.stubEnv('ANONYMOUS_MESSAGE_PUBLIC_PAGES_ENABLED', 'true')
        const approved = await readApprovedAnonymousMessage(firstId)
        expect(approved).toEqual({
          message: '公開共有テスト',
          reply: '公開した返信',
          publicId: firstId,
          publishedAt: expect.any(String),
        })
        expect(Object.keys(approved ?? {}).sort()).toEqual([
          'message',
          'publicId',
          'publishedAt',
          'reply',
        ])
        expect(JSON.stringify(approved)).not.toContain('private-review-note')
        expect(JSON.stringify(approved)).not.toContain(requestId)

        await changeAnonymousPublication(payload, doc.id, actorId, 'unpublish')
        expect(await readApprovedAnonymousMessage(firstId)).toBeNull()

        const second = await changeAnonymousPublication(payload, doc.id, actorId, 'publish')
        expect(second.publicId).toMatch(/^[A-Za-z0-9_-]{22}$/)
        expect(second.publicId).not.toBe(firstId)
        expect(await readApprovedAnonymousMessage(firstId)).toBeNull()
        expect((await readApprovedAnonymousMessage(second.publicId!))?.message).toBe(
          '公開共有テスト',
        )
      } finally {
        vi.unstubAllEnvs()
        const state = await payload.db.drizzle.execute(sql`
          SELECT "is_public" FROM "ivmz_home"."anonymous_messages" WHERE "id" = ${doc.id}
        `)
        if (state.rows[0]?.is_public === true) {
          await changeAnonymousPublication(payload, doc.id, actorId, 'unpublish')
        }
        await payload.db.drizzle.execute(sql`
          DELETE FROM "ivmz_home"."anonymous_message_publication_audit"
          WHERE "message_id" = ${doc.id}
        `)
        await payload.db.drizzle.execute(sql`
          DELETE FROM "ivmz_home"."anonymous_messages" WHERE "id" = ${doc.id}
        `)
      }
    }, 45_000)
  },
)
