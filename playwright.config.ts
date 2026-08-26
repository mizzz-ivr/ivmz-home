import { defineConfig, devices } from '@playwright/test'

const remoteBaseURL = process.env.E2E_BASE_URL
const baseURL = remoteBaseURL ?? 'http://127.0.0.1:3000'
const payloadSecurityTest = /payload\.spec\.ts/

export default defineConfig({
  testDir: './tests/e2e',
  retries: remoteBaseURL ? 2 : 0,
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
      use: { ...devices['iPhone 13'], browserName: 'webkit' },
    },
    {
      name: 'payload-security',
      testMatch: payloadSecurityTest,
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
