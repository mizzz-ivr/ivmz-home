export default function payloadAuthRateLimit() {
  return undefined
}

export const config = {
  path: [
    '/api/users/login',
    '/api/users/forgot-password',
    '/api/users/reset-password',
    '/api/users/unlock',
    '/api/users/refresh-token',
    '/api/users/verify/*',
  ],
  method: 'POST',
  rateLimit: {
    windowLimit: 10,
    windowSize: 60,
    aggregateBy: ['ip', 'domain'],
  },
}
