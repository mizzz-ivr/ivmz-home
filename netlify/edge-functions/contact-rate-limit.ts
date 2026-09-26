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
  rateLimit: {
    action: 'rate_limit',
    windowLimit: 5,
    windowSize: 60,
    aggregateBy: ['ip', 'domain'],
  },
}
