type RateLimitContext = {
  next: () => Promise<Response>
}

/**
 * Upload start + scan polling are chattier than the contact submit itself (the browser polls the
 * scan result every few seconds), so this limit is looser than `/api/contact` but still bounded.
 */
export default async function contactAttachmentsRateLimit(
  _request: Request,
  context: RateLimitContext,
): Promise<Response> {
  return context.next()
}

export const config = {
  path: [
    '/api/contact/attachments',
    '/api/contact/attachments/policy',
    '/api/contact/attachments/finalize',
  ],
  rateLimit: {
    action: 'rate_limit',
    windowLimit: 120,
    windowSize: 60,
    aggregateBy: ['ip', 'domain'],
  },
}
