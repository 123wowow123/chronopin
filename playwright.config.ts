import { defineConfig, devices } from '@playwright/test';

// End-to-end tests against a running app (npm run build && npm start, or
// npm run dev). BASE_URL picks the server; the default is a local one.
export default defineConfig({
  testDir: './tests/e2e',
  // The accounts and pins the specs make are removed when the run ends.
  globalTeardown: './tests/e2e/cleanup.ts',
  fullyParallel: false,
  // One worker, because there is one app and one database behind it. Files
  // otherwise run side by side, and the specs that sign up, post and delete
  // move the ground under the ones that count what a search answers or read
  // the first card on a page - which failed differently on every run.
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'retain-on-failure',
    timezoneId: 'America/Los_Angeles',
  },
  // The bundled headless shell by default: the real Chrome (PW_CHANNEL=chrome)
  // opens as a second Chrome in the macOS Dock and stays in its recent apps.
  projects: [
    { name: 'desktop', testIgnore: /phone\.spec\.ts/, use: { ...devices['Desktop Chrome'], channel: process.env.PW_CHANNEL || undefined } },
    // What only exists on a narrow screen - the controls that fold behind
    // pills, and the scroll lock behind them - lives in phone.spec.ts, which
    // the desktop project skips.
    { name: 'phone', testMatch: /phone\.spec\.ts/, use: { ...devices['Pixel 5'], channel: process.env.PW_CHANNEL || undefined } },
  ],
});
