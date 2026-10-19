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
  // Free plans permit two code-based rules; share this one between Contact and Chat.
  path: ['/api/contact', '/api/chat'],
  // Limit POST only, leaving the chat availability GET and other reads unrestricted.
  method: 'POST',
  rateLimit: {
    action: 'rate_limit',
    windowLimit: 5,
    windowSize: 60,
    aggregateBy: ['ip', 'domain'],
  },
}
