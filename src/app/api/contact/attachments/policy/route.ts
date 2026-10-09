import { toPublicPolicy, DISABLED_POLICY } from '@/contact/attachments/policy'
import { getAttachmentRuntime } from '@/contact/attachments/runtime'
import { json } from '@/contact/attachments/http'

export const runtime = 'nodejs'

/** What the form may offer. Never reveals bucket names or credentials. */
export async function GET() {
  const attachments = await getAttachmentRuntime()
  return json(toPublicPolicy(attachments?.policy ?? DISABLED_POLICY), 200)
}
