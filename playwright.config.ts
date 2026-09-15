import { defineConfig, devices } from '@playwright/test';

// End-to-end tests against a running app (npm run build && npm start, or
// npm run dev). BASE_URL picks the server; the default is a local one.
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'retain-on-failure',
    timezoneId: 'America/Los_Angeles',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], channel: process.env.PW_CHANNEL || 'chrome' } },
  ],
});
