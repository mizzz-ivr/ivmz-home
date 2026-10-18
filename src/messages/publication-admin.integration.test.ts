// @vitest-environment node
import { randomUUID } from 'node:crypto'

import { sql } from '@payloadcms/db-postgres'
import { describe, expect, it } from 'vitest'

import { changeAnonymousPublication, PublicationRejected } from './publication-admin'

describe.skipIf(process.env.ANONYMOUS_PUBLICATION_DB_INTEGRATION !== 'true')(
  'audited publication transaction (PostgreSQL 17)',
  () => {
    it('only approves replied messages, serializes concurrent calls, and rotates the public ID after withdrawal', async () => {
      const [{ getPayload }, { default: config }] = await Promise.all([
        import('payload'),
        import('../payload.config'),
      ])
      const payload = await getPayload({ config })
      const requestId = randomUUID()
      const doc = await payload.create({
        collection: 'anonymous-messages',
        overrideAccess: true,
        data: { requestId, message: '投稿テスト', status: 'new', isPublic: false },
      })
      const actorId = 1
      try {
        await expect(
          changeAnonymousPublication(payload, doc.id, actorId, 'publish'),
        ).rejects.toMatchObject({
          code: 'reply_not_ready',
        } satisfies Partial<PublicationRejected>)
        await payload.update({
          collection: 'anonymous-messages',
          id: doc.id,
          overrideAccess: true,
          data: { reply: '承認した返信', status: 'replied' },
        })
        const outcomes = await Promise.allSettled(
          Array.from({ length: 4 }, () =>
            changeAnonymousPublication(payload, doc.id, actorId, 'publish'),
          ),
        )
        const published = outcomes.filter((result) => result.status === 'fulfilled')
        expect(published).toHaveLength(1)
        const id = published[0].status === 'fulfilled' ? published[0].value.publicId : null
        expect(id).toMatch(/^[A-Za-z0-9_-]{22}$/)

        // A stale admin write, even one queued while publication held the row lock,
        // cannot replace an approved reply through direct SQL.
        await expect(
          payload.db.drizzle.execute(sql`
            UPDATE "ivmz_home"."anonymous_messages"
            SET "reply" = '未審査の内容'
            WHERE "id" = ${doc.id}
          `),
        ).rejects.toThrow()
        await expect(
          payload.db.drizzle.execute(sql`
            DELETE FROM "ivmz_home"."anonymous_messages" WHERE "id" = ${doc.id}
          `),
        ).rejects.toThrow()

        const audit = await payload.db.drizzle.execute(sql`
          SELECT "action" FROM "ivmz_home"."anonymous_message_publication_audit"
          WHERE "message_id" = ${doc.id}
        `)
        expect(audit.rows.map((row) => row.action)).toEqual(['publish'])

        const withdrawal = await changeAnonymousPublication(payload, doc.id, actorId, 'unpublish')
        expect(withdrawal.publicId).toBeNull()
        const hidden = await payload.findByID({ collection: 'anonymous-messages', id: doc.id })
        expect(hidden.isPublic).toBe(false)
        expect(hidden.publicId).toBeFalsy()
        expect(hidden.publishedAt).toBeFalsy()

        const renewed = await changeAnonymousPublication(payload, doc.id, actorId, 'publish')
        expect(renewed.publicId).not.toBe(id)
        const actions = await payload.db.drizzle.execute(sql`
          SELECT "action" FROM "ivmz_home"."anonymous_message_publication_audit"
          WHERE "message_id" = ${doc.id} ORDER BY "id"
        `)
        expect(actions.rows.map((row) => row.action)).toEqual(['publish', 'unpublish', 'publish'])
      } finally {
        const state = await payload.db.drizzle.execute(sql`
          SELECT "is_public" FROM "ivmz_home"."anonymous_messages" WHERE "id" = ${doc.id}
        `)
        if (state.rows[0]?.is_public === true) {
          await changeAnonymousPublication(payload, doc.id, actorId, 'unpublish')
        }
        await payload.db.drizzle.execute(sql`
          DELETE FROM "ivmz_home"."anonymous_message_publication_audit" WHERE "message_id" = ${doc.id}
        `)
        await payload.db.drizzle.execute(sql`
          DELETE FROM "ivmz_home"."anonymous_messages" WHERE "id" = ${doc.id}
        `)
      }
    }, 30_000)
  },
)
