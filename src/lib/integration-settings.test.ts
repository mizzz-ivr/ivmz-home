import { describe, expect, it } from 'vitest'

import { mergeIntegrationSettings } from './integration-settings'

describe('mergeIntegrationSettings', () => {
  it('prefers CMS values and trims them', () => {
    expect(
      mergeIntegrationSettings(
        { googleCalendarId: ' a@group.calendar.google.com ', youtubeChannel: '@me' },
        { GOOGLE_CALENDAR_ID: 'env', YOUTUBE_CHANNEL_ID: 'env' },
      ),
    ).toEqual({
      calendarId: 'a@group.calendar.google.com',
      embedUrls: undefined,
      youtubeChannel: '@me',
    })
  })

  it('falls back to the environment for empty CMS fields', () => {
    expect(
      mergeIntegrationSettings(
        { googleCalendarId: '  ', socialEmbedUrls: null },
        { GOOGLE_CALENDAR_ID: 'env-cal', SOCIAL_EMBED_URLS: 'https://x.com/a/status/1' },
      ),
    ).toEqual({
      calendarId: 'env-cal',
      embedUrls: 'https://x.com/a/status/1',
      youtubeChannel: undefined,
    })
  })

  it('works with no CMS document at all', () => {
    expect(mergeIntegrationSettings(null, {})).toEqual({
      calendarId: undefined,
      embedUrls: undefined,
      youtubeChannel: undefined,
    })
  })
})
