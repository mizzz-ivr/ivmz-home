import { createHmac } from 'node:crypto'
import { isIP } from 'node:net'

import { sql } from '@payloadcms/db-postgres'
import type { Payload } from 'payload'

import type { AnonymousMessageInput } from './schema'

const MAX_SUBMISSIONS_PER_WINDOW = 5

/** A raw address is used only in-memory to derive a keyed digest; never persisted or logged. */
export function anonymousClientDigest(request: Request, secret: string): string | null {
  const ip = request.headers.get('x-nf-client-connection-ip')?.trim() ?? ''
  if (!isIP(ip) || secret.length < 32) return null
  return createHmac('sha256', secret).update(ip).digest('hex')
}

export type SaveResult = 'created' | 'duplicate' | 'conflict'

/**
 * PostgreSQL is the shared, atomic rate-limit authority across Netlify serverless instances.
 * Payload's configured pool is reused; neither a client-controlled forwarded IP nor local memory
 * is used to partition buckets. An unavailable database fails closed at the HTTP boundary.
 */
export class PayloadAnonymousMessageStore {
  private async getPayload(): Promise<Payload> {
    const [{ getPayload }, { default: config }] = await Promise.all([
      import('payload'),
      import('../payload.config'),
    ])
    return getPayload({ config })
  }

  async consume(request: Request, secret: string): Promise<boolean> {
    const key = anonymousClientDigest(request, secret)
    if (!key) return false

    const payload = await this.getPayload()
    const result = await payload.db.drizzle.execute(sql`
      INSERT INTO "ivmz_home"."anonymous_message_rate_limits" ("key", "attempts", "expires_at")
      VALUES (${key}, 1, NOW() + INTERVAL '10 minutes')
      ON CONFLICT ("key") DO UPDATE SET
        "attempts" = CASE
          WHEN "anonymous_message_rate_limits"."expires_at" <= NOW() THEN 1
          ELSE "anonymous_message_rate_limits"."attempts" + 1
        END,
        "expires_at" = CASE
          WHEN "anonymous_message_rate_limits"."expires_at" <= NOW()
            THEN NOW() + INTERVAL '10 minutes'
          ELSE "anonymous_message_rate_limits"."expires_at"
        END
      RETURNING "attempts"
    `)
    const count = Number(result.rows[0]?.attempts)
    if (!Number.isSafeInteger(count) || count < 1) throw new Error('RateLimitStoreInvalid')

    // Bounded retention without a global in-memory scheduler. Index makes cleanup cheap.
    await payload.db.drizzle.execute(sql`
      DELETE FROM "ivmz_home"."anonymous_message_rate_limits"
      WHERE "expires_at" < NOW() - INTERVAL '1 day'
    `)
    return count <= MAX_SUBMISSIONS_PER_WINDOW
  }

  private async find(requestId: string) {
    const payload = await this.getPayload()
    const match = await payload.find({
      collection: 'anonymous-messages',
      depth: 0,
      limit: 1,
      pagination: false,
      overrideAccess: true,
      where: { requestId: { equals: requestId } },
    })
    return match.docs[0]
  }

  async save(input: AnonymousMessageInput): Promise<SaveResult> {
    const existing = await this.find(input.requestId)
    if (existing) return existing.message === input.message ? 'duplicate' : 'conflict'

    const payload = await this.getPayload()
    try {
      await payload.create({
        collection: 'anonymous-messages',
        overrideAccess: true,
        data: {
          isPublic: false,
          message: input.message,
          requestId: input.requestId,
          status: 'new',
        },
      })
      return 'created'
    } catch (error) {
      // A concurrent insert may have won the DB UNIQUE race. Never swallow unrelated errors.
      const winner = await this.find(input.requestId).catch(() => undefined)
      if (winner) return winner.message === input.message ? 'duplicate' : 'conflict'
      throw error
    }
  }
}
