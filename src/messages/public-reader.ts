import { cache } from 'react'

import {
  isValidAnonymousPublicId,
  toPublicAnonymousMessage,
  type PublicAnonymousMessage,
} from './publication'

type FindCandidate = (publicId: string) => Promise<unknown>

/**
 * All public rendering calls pass through this independent, fail-closed boundary.
 * A hidden/revoked document must never be revealed by its former share ID.
 */
export async function resolveApprovedAnonymousMessage(
  publicId: unknown,
  enabled: boolean,
  findCandidate: FindCandidate,
): Promise<PublicAnonymousMessage | null> {
  if (!enabled || !isValidAnonymousPublicId(publicId)) return null

  try {
    const candidate = await findCandidate(publicId)
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return null
    return toPublicAnonymousMessage(candidate)
  } catch {
    // DB failures are never a reason to return a previously-approved cached document.
    return null
  }
}

/** React.cache is request-local; never persist a public response beyond the current request. */
export const readApprovedAnonymousMessage = cache(async (publicId: string) => {
  return resolveApprovedAnonymousMessage(
    publicId,
    process.env.ANONYMOUS_MESSAGE_PUBLIC_PAGES_ENABLED === 'true',
    async (safeId) => {
      const [{ getPayload }, { default: config }] = await Promise.all([
        import('payload'),
        import('../payload.config'),
      ])
      const payload = await getPayload({ config })
      const records = await payload.find({
        collection: 'anonymous-messages',
        depth: 0,
        limit: 1,
        pagination: false,
        overrideAccess: true,
        where: {
          and: [
            { publicId: { equals: safeId } },
            { isPublic: { equals: true } },
            { status: { equals: 'replied' } },
          ],
        },
      })
      return records.docs[0] ?? null
    },
  )
})
