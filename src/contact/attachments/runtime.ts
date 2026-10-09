import { resolveAttachmentPolicy, type AttachmentPolicy, type ContactSettingsInput } from './policy'
import { createAttachmentStorage, type AttachmentStorage } from './storage'
import type { ServiceDeps } from './service'

export type AttachmentRuntime = ServiceDeps & { storage: AttachmentStorage }

async function loadSettings(): Promise<ContactSettingsInput | null> {
  try {
    const [{ getPayload }, { default: config }] = await Promise.all([
      import('payload'),
      import('../../payload.config'),
    ])
    const payload = await getPayload({ config })
    return (await payload.findGlobal({
      overrideAccess: true,
      slug: 'contact-settings',
    })) as ContactSettingsInput
  } catch {
    // Fail closed: if the CMS cannot be read, attachments are simply unavailable.
    return null
  }
}

/** `null` when storage/signing is not configured; the policy inside is disabled unless an admin enabled it. */
export async function getAttachmentRuntime(
  options: { loadSettings?: () => Promise<ContactSettingsInput | null> } = {},
): Promise<AttachmentRuntime | null> {
  const storage = createAttachmentStorage()
  const secret = process.env.PAYLOAD_SECRET
  if (!storage || !secret) return null

  const settings = await (options.loadSettings ?? loadSettings)()
  const policy: AttachmentPolicy = resolveAttachmentPolicy(settings, { storageConfigured: true })
  return { policy, secret, storage }
}
