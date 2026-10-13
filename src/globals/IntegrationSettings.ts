import type { GlobalConfig } from 'payload'

import { isAuthenticated } from '@/access/is-authenticated'

/**
 * Public integrations shown on /links and /schedule. Everything here is public information only
 * (a channel, a public calendar id, post URLs); secrets such as API tokens stay in environment
 * variables. Empty fields fall back to the matching environment variable, and a bad value simply
 * hides the section instead of breaking the page.
 */
export const IntegrationSettings: GlobalConfig = {
  slug: 'integration-settings',
  label: 'Integrations',
  admin: { group: 'Content' },
  access: {
    // Pages read these on the server; nothing needs anonymous API access.
    read: isAuthenticated,
    update: isAuthenticated,
  },
  fields: [
    {
      name: 'youtubeChannel',
      type: 'text',
      label: 'YouTube channel',
      maxLength: 200,
      admin: {
        description:
          'Channel URL (https://www.youtube.com/@name), a channel ID (UC…) or @name. Shows the latest videos on /links. Leave empty to hide.',
      },
    },
    {
      name: 'googleCalendarId',
      type: 'text',
      label: 'Google Calendar ID',
      maxLength: 200,
      admin: {
        description:
          'The calendar must be shared publicly. Example: xxxx@group.calendar.google.com. Shows upcoming events on /schedule. Leave empty to hide.',
      },
    },
    {
      name: 'socialEmbedUrls',
      type: 'textarea',
      label: 'Post embeds (one URL per line, max 6)',
      maxLength: 2000,
      admin: {
        description:
          'Individual posts only: x.com/<user>/status/<id>, instagram.com/p/<code>, instagram.com/reel/<code>, tiktok.com/@<user>/video/<id>, youtube.com/watch?v=<id>. Nothing loads from these services until a visitor clicks.',
      },
    },
  ],
}
