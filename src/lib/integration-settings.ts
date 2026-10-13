/**
 * Public integration settings: the CMS `integration-settings` global wins, the matching environment
 * variable is the fallback. Reading never throws; a CMS outage just means "use the environment".
 */

export type IntegrationSettings = {
  calendarId: string | undefined
  embedUrls: string | undefined
  youtubeChannel: string | undefined
}

type RawSettings = {
  googleCalendarId?: string | null
  socialEmbedUrls?: string | null
  youtubeChannel?: string | null
} | null

const clean = (value: string | null | undefined) => value?.trim() || undefined

export function mergeIntegrationSettings(
  cms: RawSettings,
  env: Partial<Record<string, string | undefined>> = process.env,
): IntegrationSettings {
  return {
    calendarId: clean(cms?.googleCalendarId) ?? clean(env.GOOGLE_CALENDAR_ID),
    embedUrls: clean(cms?.socialEmbedUrls) ?? clean(env.SOCIAL_EMBED_URLS),
    youtubeChannel: clean(cms?.youtubeChannel) ?? clean(env.YOUTUBE_CHANNEL_ID),
  }
}

export async function getIntegrationSettings(): Promise<IntegrationSettings> {
  try {
    const [{ getPayload }, { default: config }] = await Promise.all([
      import('payload'),
      import('../payload.config'),
    ])
    const payload = await getPayload({ config })
    const cms = (await payload.findGlobal({
      overrideAccess: true,
      slug: 'integration-settings',
    })) as RawSettings
    return mergeIntegrationSettings(cms)
  } catch {
    return mergeIntegrationSettings(null)
  }
}
