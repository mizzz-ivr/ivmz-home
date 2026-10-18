// @vitest-environment node
import { randomUUID } from 'node:crypto'

import { sql } from '@payloadcms/db-postgres'
import { describe, expect, it } from 'vitest'

import { changeAnonymousPublication } from './publication-admin'

const LOCAL_CI_HOST = '127.0.0.1'
const LOCAL_CI_PORT = '3100'

function assertIsolatedHttpTestEnvironment() {
  const database = new URL(process.env.DATABASE_URL ?? 'postgresql://invalid')
  const base = new URL(process.env.ANONYMOUS_PUBLIC_HTTP_BASE_URL ?? 'http://invalid')
  if (
    process.env.CI !== 'true' ||
    process.env.ANONYMOUS_PUBLIC_HTTP_DB_INTEGRATION !== 'true' ||
    database.hostname !== LOCAL_CI_HOST ||
    database.port !== '5432' ||
    database.pathname !== '/ivmz_home' ||
    base.protocol !== 'http:' ||
    base.hostname !== LOCAL_CI_HOST ||
    base.port !== LOCAL_CI_PORT
  ) {
    throw new Error('Public HTTP integration requires isolated CI PostgreSQL and localhost')
  }
  return base
}

describe.skipIf(process.env.ANONYMOUS_PUBLIC_HTTP_DB_INTEGRATION !== 'true')(
  'shared anonymous message over HTTP (ephemeral CI only)',
  () => {
    it('renders approved SSR and PNG, then returns 404 for both after withdrawal', async () => {
      const base = assertIsolatedHttpTestEnvironment()
      const [{ getPayload }, { default: config }] = await Promise.all([
        import('payload'),
        import('../payload.config'),
      ])
      const payload = await getPayload({ config })
      const requestId = randomUUID()
      const message = '安全な公開テスト'
      const reply = '確認済みの返信'
      const secretNote = 'private-note-http-should-never-render'
      const doc = await payload.create({
        collection: 'anonymous-messages',
        overrideAccess: true,
        data: {
          requestId,
          message,
          status: 'new',
          isPublic: false,
          internalNote: secretNote,
        },
      })
      const getPage = (id: string) =>
        fetch(new URL(`/message/${id}`, base), { cache: 'no-store' })

      const actorId = 1
      let approvedId: string | null = null
      try {
        await payload.update({
          collection: 'anonymous-messages',
          overrideAccess: true,
          id: doc.id,
          data: { status: 'replied', reply },
        })
        const first = await changeAnonymousPublication(payload, doc.id, actorId, 'publish')
        approvedId = first.publicId
        expect(approvedId).toMatch(/^[A-Za-z0-9_-]{22}$/)

        const page = await getPage(approvedId!)
        expect(page.status).toBe(200)
        const html = await page.text()
        expect(html).toContain(message)
        expect(html).toContain(reply)
        expect(html).toContain('noindex')
        expect(html).not.toContain(secretNote)
        expect(html).not.toContain(requestId)

        const ogLocation = html.match(/<meta\\s+property="og:image"\\s+content="([^"]+)"/)?.[1]
        expect(ogLocation).toBeDefined()
        // Keep the generated metadata path and query, but never fetch an external origin.
        const metadataUrl = new URL(ogLocation!, base)
        expect(metadataUrl.pathname).toContain(`/message/${approvedId}/opengraph-image`)
        const localImageUrl = new URL(`${metadataUrl.pathname}${metadataUrl.search}`, base)
        const getImage = () => fetch(localImageUrl, { cache: 'no-store' })

        const og = await getImage()
        expect(og.status).toBe(200)
        expect(og.headers.get('content-type')).toContain('image/png')
        expect(og.headers.get('cache-control')).toContain('no-store')
        const png = new Uint8Array(await og.arrayBuffer())
        expect(Array.from(png.slice(0, 8))).toEqual([137, 80, 78, 71, 13, 10, 26, 10])

        await changeAnonymousPublication(payload, doc.id, actorId, 'unpublish')
        expect((await getPage(approvedId!)).status).toBe(404)
        expect((await getImage()).status).toBe(404)

        const second = await changeAnonymousPublication(payload, doc.id, actorId, 'publish')
        expect(second.publicId).not.toBe(approvedId)
        expect((await getPage(approvedId!)).status).toBe(404)
        expect((await getImage()).status).toBe(404)
        expect((await getPage(second.publicId!)).status).toBe(200)
      } finally {
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
    }, 60_000)
  },
)
