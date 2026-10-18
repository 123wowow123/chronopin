// Prints the confirmation link (0071) for a throwaway e2e account, the one its
// email would carry, so a Playwright spec can "click" it: an account that
// signs up has to confirm its address before it may post. Only for addresses
// that look like the specs' own (E2E_EMAIL), and only where the script can
// reach the app's database - a local run, like cleanE2e.ts.
//
//   npx tsx scripts/data/e2eVerifyLink.ts e2e-abc@example.com

import '../env';
import * as db from '@/server/db';
import { signVerifyToken } from '@/server/emailVerification';
import User from '@/server/model/user';
import { E2E_EMAIL } from './excludeE2e';

async function run() {
  const email = process.argv[2] ?? '';
  if (!E2E_EMAIL.test(email)) throw new Error(`${email || 'An email'} is not an e2e test address`);
  const { user } = await User.getByEmail(email);
  if (!user) throw new Error(`No account for ${email}`);
  console.log(`/auth/verify-email?token=${encodeURIComponent(await signVerifyToken(user.id, user.email))}`);
}

run()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => db.closeConnection());
