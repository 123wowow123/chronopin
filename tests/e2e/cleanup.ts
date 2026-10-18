import { execFile } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

// Run when a Playwright run finishes (playwright.config.ts): the specs sign up
// throwaway accounts and post pins as them, and those would otherwise pile up
// in the database run after run. KEEP_E2E_DATA=1 leaves them, to look at what
// a failing run made.
export default async function cleanUp() {
  const baseURL = process.env.BASE_URL;
  if (baseURL && !/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/.test(baseURL)) {
    console.log(`\nLeaving the test data: ${baseURL} has a database of its own, which npm run clean:e2e cannot reach.`);
    return;
  }
  if (process.env.KEEP_E2E_DATA) {
    console.log('\nKEEP_E2E_DATA is set: leaving the test data in the database.');
    return;
  }
  try {
    const { stdout } = await promisify(execFile)('npx', ['tsx', 'scripts/data/cleanE2e.ts'], { cwd: root });
    console.log(`\n${stdout.trim()}`);
  } catch (err) {
    // A run that passed should not fail over its own tidying up.
    console.warn(`\nCleaning up the test data failed (npm run clean:e2e does it): ${(err as Error).message}`);
  }
}
