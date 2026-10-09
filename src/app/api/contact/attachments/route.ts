import { json, readGuardedJson } from '@/contact/attachments/http'
import { getAttachmentRuntime } from '@/contact/attachments/runtime'
import { initUpload } from '@/contact/attachments/service'

export const runtime = 'nodejs'

const STATUS: Record<string, number> = {
  disabled: 403,
  invalid_name: 422,
  invalid_size: 422,
  too_large: 413,
  type_not_allowed: 422,
}

/** Step 1: validate the declared file and hand back a presigned POST into the quarantine prefix. */
export async function POST(request: Request) {
  const guarded = await readGuardedJson(request, { limit: 20, scope: 'attachments-init' })
  if (!guarded.ok) return guarded.response

  const attachments = await getAttachmentRuntime()
  if (!attachments) return json({ code: 'disabled', ok: false }, 403)

  try {
    const result = await initUpload(attachments, {
      name: guarded.body.name,
      size: guarded.body.size,
      type: guarded.body.type,
    })

    if (!result.ok) return json({ code: result.code, ok: false }, STATUS[result.code] ?? 422)
    return json(
      {
        expiresIn: result.expiresIn,
        ok: true,
        upload: result.upload,
        uploadToken: result.uploadToken,
      },
      201,
    )
  } catch (error) {
    console.error(
      'CONTACT_ATTACHMENT_INIT_FAILED',
      JSON.stringify({ error: error instanceof Error ? error.name : 'UnknownError' }),
    )
    return json({ code: 'upload_unavailable', ok: false }, 502)
  }
}
