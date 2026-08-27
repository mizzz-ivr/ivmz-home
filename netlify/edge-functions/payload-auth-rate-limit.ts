export default function payloadAuthRateLimit() {
  return undefined
}

export const config = {
  path: '/api/users/login',
  rateLimit: {
    windowLimit: 10,
    windowSize: 60,
    aggregateBy: ['ip', 'domain'],
  },
}
