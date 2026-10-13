import type { Payload } from 'payload'

import { createContactNotifier } from '@/contact/notify'
import { createAttachmentStorage } from '@/contact/attachments/storage'

import { isPurgeEnabled } from './retention'

export type OpsConfig = {
  alertWebhook: boolean
  attachmentsEnabled: boolean
  attachmentsStorage: boolean
  autoreply: boolean
  healthToken: boolean
  mail: boolean
  purgeEnabled: boolean
  turnstile: boolean
}

/** Which optional features are switched on. Booleans only; secrets are never read out. */
export async function readOpsConfig(payload: Payload): Promise<OpsConfig> {
  let attachmentsEnabled = false
  try {
    const settings = await payload.findGlobal({ overrideAccess: true, slug: 'contact-settings' })
    attachmentsEnabled = settings.attachmentsEnabled === true
  } catch {
    attachmentsEnabled = false
  }

  return {
    alertWebhook: Boolean(process.env.OPS_ALERT_WEBHOOK_URL),
    attachmentsEnabled,
    attachmentsStorage: createAttachmentStorage() !== null,
    autoreply: process.env.CONTACT_AUTOREPLY !== 'off',
    healthToken: (process.env.OPS_HEALTH_TOKEN ?? '').length >= 24,
    mail: createContactNotifier().kind !== 'none',
    purgeEnabled: isPurgeEnabled(),
    turnstile: Boolean(process.env.TURNSTILE_SECRET_KEY && process.env.TURNSTILE_SITE_KEY),
  }
}
