type ChatRateLimitContext = {
  next: () => Promise<Response>
}

/**
 * Netlify's shared edge limiter rejects excessive POSTs before they reach
 * serverless functions or invoke a billable AI model.
 */
export default async function chatRateLimit(
  _request: Request,
  context: ChatRateLimitContext,
): Promise<Response> {
  return context.next()
}

export const config = {
  path: '/api/chat',
  method: 'POST',
  rateLimit: {
    action: 'rate_limit',
    windowLimit: 12,
    windowSize: 60,
    aggregateBy: ['ip', 'domain'],
  },
}
