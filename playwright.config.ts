import { defineConfig, devices } from '@playwright/test'

const remoteBaseURL = process.env.E2E_BASE_URL
const baseURL = remoteBaseURL ?? 'http://127.0.0.1:3000'
const payloadSecurityTest = /payload\.spec\.ts/
const mobileWebKit = {
  ...devices['iPhone 13'],
  browserName: 'webkit' as const,
  // Device descriptors carry a platform-specific UA. On Linux remote CI, keep the
  // iPhone viewport/touch/mobile emulation while letting WebKit use the runner UA
  // so the request does not claim to be an Apple-device Safari session.
  ...(remoteBaseURL ? { userAgent: undefined } : {}),
}

export default defineConfig({
  testDir: './tests/e2e',
  // Remote navigation and idempotent API GETs have scoped transport-only retries.
  // Keep test-level retries disabled so HTTP/security/assertion failures are not
  // multiplied or accidentally masked by a second retry layer.
  retries: 0,
  workers: remoteBaseURL ? 1 : undefined,
  use: { baseURL },
  webServer: remoteBaseURL
    ? undefined
    : {
        command: 'pnpm dev',
        url: baseURL,
        reuseExistingServer: true,
      },
  projects: [
    {
      name: 'chromium',
      testIgnore: payloadSecurityTest,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-webkit',
      testIgnore: payloadSecurityTest,
      use: mobileWebKit,
    },
    {
      name: 'payload-security',
      testMatch: payloadSecurityTest,
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
