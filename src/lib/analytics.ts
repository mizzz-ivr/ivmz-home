export const ANALYTICS_CHOICE_KEY = 'ivmz-analytics-consent-v1'

/** A GA4 Measurement ID is public configuration, not a secret. */
export function parseMeasurementId(value: string | undefined): string | null {
  const id = value?.trim() ?? ''
  return /^G-[A-Z0-9]{6,20}$/.test(id) ? id : null
}

/** Never send admin, API, private-message or form paths to third-party analytics. */
export function isTrackablePath(path: string): boolean {
  return path.startsWith('/') && !/^\/(admin|api|contact|message|legal)(\/|$)/.test(path)
}
