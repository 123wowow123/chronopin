// Loads .env.local then .env into process.env for scripts, the way Next.js
// does for the app. Import this first in every script.

import { existsSync } from 'node:fs';

(process.env as Record<string, string>).NODE_ENV ||= 'development';

for (const file of ['.env.local', '.env']) {
  if (existsSync(file)) {
    // Values already in the environment win, as in Next.js.
    process.loadEnvFile(file);
  }
}
