import { site } from './site'

export type ContactCategory =
  | 'personal'
  | 'development'
  | 'job'
  | 'collaboration'
  | 'media'
  | 'community'
  | 'team'
  | 'security'

export function recipientFor(category: ContactCategory): string {
  if (category === 'community' || category === 'team') return site.teamEmail
  if (category === 'security') return site.securityEmail
  return site.contactEmail
}
