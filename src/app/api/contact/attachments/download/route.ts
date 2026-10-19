import { getAttachmentRuntime } from '@/contact/attachments/runtime'

export const runtime = 'nodejs'

const DOWNLOAD_URL_TTL_SECONDS = 60

const downloadHeaders = {
  'Cache-Control': 'private, no-store',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
}

function plain(status: number) {
  return new Response(null, { headers: downloadHeaders, status })
}

/**
 * Admin-only. Looks the attachment up by its row id, then redirects to a 60-second presigned URL
 * that forces `attachment` + `application/octet-stream`, so a browser never renders or executes it.
 */
export async function GET(request: Request) {
  const rowId = new URL(request.url).searchParams.get('row')
  if (!rowId || rowId.length > 64 || !/^[A-Za-z0-9_-]+$/.test(rowId)) return plain(400)

  const [{ getPayload }, { default: config }] = await Promise.all([
    import('payload'),
    import('../../../../../payload.config'),
  ])
  const payload = await getPayload({ config })

  const { user } = await payload.auth({ headers: request.headers })
  if (!user) return plain(401)
  if (user.collection !== payload.config.admin.user) return plain(403)

  const found = await payload.find({
    collection: 'contact-submissions',
    depth: 0,
    limit: 1,
    overrideAccess: false,
    pagination: false,
    user,
    where: { 'attachments.id': { equals: rowId } },
  })
  const attachment = found.docs[0]?.attachments?.find((row) => row.id === rowId)
  if (!attachment) return plain(404)

  const attachments = await getAttachmentRuntime({ loadSettings: async () => null })
  if (!attachments) return plain(503)

  // A DB reference can outlive S3's clean/ retention window. Check availability before
  // signing so administrators do not receive a working-looking URL to a missing object.
  // A transient S3 error is not evidence that the object was deleted.
  let url: string
  try {
    if (!(await attachments.storage.exists(attachment.key))) return plain(404)
    url = await attachments.storage.createDownloadUrl(
      attachment.key,
      attachment.filename,
      DOWNLOAD_URL_TTL_SECONDS,
    )
  } catch {
    return plain(503)
  }
  return new Response(null, {
    headers: { ...downloadHeaders, Location: url },
    status: 302,
  })
}
