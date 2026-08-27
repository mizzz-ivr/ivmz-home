type PayloadAuthEdgeContext = {
  next: () => Promise<Response>
}

export default async function payloadAuthRateLimit(
  _request: Request,
  context: PayloadAuthEdgeContext,
): Promise<Response> {
  return context.next()
}

export const config = {
  path: '/api/users/login',
  rateLimit: {
    action: 'rate_limit',
    windowLimit: 10,
    windowSize: 60,
    aggregateBy: ['ip', 'domain'],
  },
}
