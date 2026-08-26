import { defineConfig, devices } from '@playwright/test'

const remoteBaseURL = process.env.E2E_BASE_URL
const baseURL = remoteBaseURL ?? 'http://127.0.0.1:3000'

export default defineConfig({
  testDir: './tests/e2e',
  retries: remoteBaseURL ? 2 : 0,
  use: { baseURL },
  webServer: remoteBaseURL
    ? undefined
    : {
        command: 'pnpm dev',
        url: baseURL,
        reuseExistingServer: true,
      },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-webkit', use: { ...devices['iPhone 13'], browserName: 'webkit' } },
  ],
})
