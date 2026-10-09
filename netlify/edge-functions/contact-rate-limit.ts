type ContactRateLimitContext = {
  next: () => Promise<Response>
}

export default async function contactRateLimit(
  _request: Request,
  context: ContactRateLimitContext,
): Promise<Response> {
  return context.next()
}

export const config = {
  path: '/api/contact',
  // Only submissions count against the quota; stray GETs must not lock out a real visitor.
  method: 'POST',
  rateLimit: {
    action: 'rate_limit',
    windowLimit: 5,
    windowSize: 60,
    aggregateBy: ['ip', 'domain'],
  },
}
