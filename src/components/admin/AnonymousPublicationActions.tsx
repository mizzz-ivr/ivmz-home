import { AnonymousPublicationActionsClient } from './AnonymousPublicationActionsClient'

/**
 * Server-only feature flag. The UI does not expose secrets or let a client opt in.
 * The API independently repeats the flag and authorization checks.
 */
export function AnonymousPublicationActions() {
  return (
    <AnonymousPublicationActionsClient
      enabled={process.env.ANONYMOUS_MESSAGE_PUBLICATION_ENABLED === 'true'}
    />
  )
}
