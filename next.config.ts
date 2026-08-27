import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'

const payloadBuildContext = process.env.CONTEXT ?? ''
const payloadBuildOrigin =
  payloadBuildContext === 'production'
    ? 'https://ivmz.ivrm.jp'
    : payloadBuildContext === 'deploy-preview' || payloadBuildContext === 'branch-deploy'
      ? (process.env.DEPLOY_PRIME_URL ?? '')
      : ''

const securityHeaders = [
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
  {
    key: 'Content-Security-Policy-Report-Only',
    value: "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'self'",
  },
]

const nextConfig: NextConfig = {
  env: {
    // Netlify exposes CONTEXT / DEPLOY_PRIME_URL while building but not to the
    // Next serverless function runtime. These values are public deployment metadata,
    // so freeze them into the server bundle for Payload's runtime CORS/CSRF config.
    PAYLOAD_BUILD_CONTEXT: payloadBuildContext,
    PAYLOAD_BUILD_ORIGIN: payloadBuildOrigin,
  },
  poweredByHeader: false,
  reactStrictMode: true,
  headers: async () => [
    {
      source: '/:path*',
      headers: securityHeaders,
    },
  ],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
    ],
  },
}

export default withPayload(nextConfig)
