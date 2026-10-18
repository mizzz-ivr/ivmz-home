import { randomBytes } from 'node:crypto'

import { sql } from '@payloadcms/db-postgres'
import type { Payload } from 'payload'

export type PublicationAction = 'publish' | 'unpublish'
export type PublicationResult = { publicId: string | null }

export class PublicationRejected extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
  ) {
    super(code)
    this.name = 'PublicationRejected'
  }
}

/**
 * A single transaction owns approval and its audit entry. Serialized row locks prevent
 * simultaneous approvals or an approval racing a withdrawal.
 */
export async function changeAnonymousPublication(
  payload: Payload,
  messageId: number,
  actorUserId: number,
  action: PublicationAction,
): Promise<PublicationResult> {
  if (!Number.isSafeInteger(messageId) || messageId < 1) {
    throw new PublicationRejected('invalid_message', 400)
  }
  if (!Number.isSafeInteger(actorUserId) || actorUserId < 1) {
    throw new PublicationRejected('not_authorized', 403)
  }

  return payload.db.drizzle.transaction(async (tx) => {
    const record = await tx.execute(sql`
      SELECT "status", "message", "reply", "is_public", "public_id"
      FROM "ivmz_home"."anonymous_messages"
      WHERE "id" = ${messageId}
      FOR UPDATE
    `)
    const doc = record.rows[0]
    if (!doc) throw new PublicationRejected('not_found', 404)

    if (action === 'publish') {
      if (doc.is_public === true) throw new PublicationRejected('already_public', 409)
      if (
        doc.status !== 'replied' ||
        typeof doc.message !== 'string' ||
        !doc.message.trim() ||
        typeof doc.reply !== 'string' ||
        !doc.reply.trim()
      ) {
        throw new PublicationRejected('reply_not_ready', 409)
      }
      // A fresh ID also invalidates an old share URL if a withdrawn reply is later approved again.
      const publicId = randomBytes(16).toString('base64url')
      await tx.execute(sql`
        UPDATE "ivmz_home"."anonymous_messages"
        SET "is_public" = true, "public_id" = ${publicId},
            "published_at" = now(), "updated_at" = now()
        WHERE "id" = ${messageId}
      `)
      await tx.execute(sql`
        INSERT INTO "ivmz_home"."anonymous_message_publication_audit"
          ("message_id", "actor_user_id", "action")
        VALUES (${messageId}, ${actorUserId}, 'publish')
      `)
      return { publicId }
    }

    if (doc.is_public !== true) throw new PublicationRejected('not_public', 409)
    await tx.execute(sql`
      UPDATE "ivmz_home"."anonymous_messages"
      SET "is_public" = false, "public_id" = NULL,
          "published_at" = NULL, "updated_at" = now()
      WHERE "id" = ${messageId}
    `)
    await tx.execute(sql`
      INSERT INTO "ivmz_home"."anonymous_message_publication_audit"
        ("message_id", "actor_user_id", "action")
      VALUES (${messageId}, ${actorUserId}, 'unpublish')
    `)
    return { publicId: null }
  })
}
