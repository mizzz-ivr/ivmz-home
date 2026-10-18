/** The only fields permitted to reach public message pages, OG images, and share endpoints. */
export type PublicAnonymousMessage = Readonly<{
  message: string
  publicId: string
  publishedAt: string
  reply: string
}>

export type AnonymousMessagePublicationCandidate = {
  isPublic?: boolean | null
  message?: string | null
  publicId?: string | null
  publishedAt?: string | null
  reply?: string | null
  status?: string | null
  /** Internal fields may exist but must never be returned. */
  [key: string]: unknown
}

const PUBLIC_ID_PATTERN = /^[a-zA-Z0-9_-]{22,64}$/

/**
 * Fail closed: do not project a record until an administrator has explicitly published a reply.
 * Reuse at every public server-side read, including OG/PNG routes.
 */
export function toPublicAnonymousMessage(
  candidate: AnonymousMessagePublicationCandidate | null | undefined,
): PublicAnonymousMessage | null {
  if (!candidate || candidate.isPublic !== true || candidate.status !== 'replied') {
    return null
  }

  const { message, publicId, publishedAt, reply } = candidate
  if (
    !message?.trim() ||
    !reply?.trim() ||
    !publicId ||
    !PUBLIC_ID_PATTERN.test(publicId) ||
    !publishedAt ||
    !Number.isFinite(Date.parse(publishedAt))
  ) {
    return null
  }

  return { message, publicId, publishedAt, reply }
}
