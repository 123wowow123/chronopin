// Builds signed-in users' preference wikis (src/lib/userWiki.ts) from what
// they have opened, watched, liked and commented on. They also rebuild on
// their own after each of those, so this is the backfill and the export.
//
//   npm run user-wiki:build                      every user with a signal
//   npm run user-wiki:build -- --user 1 --user 5 just those users
//   npm run user-wiki:build -- --out ./okf-users also write them out as an OKF bundle
//
// A bundle holds users' pin history: keep it out of anything published.

import '../env';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import * as db from '@/server/db';
import UserWiki from '@/server/model/userWiki';

const { values: flags } = parseArgs({
  options: { user: { type: 'string', multiple: true }, out: { type: 'string' } },
});

async function run() {
  const userIds = flags.user?.map(Number) ?? (await UserWiki.userIdsWithSignals());
  let built = 0;
  for (const userId of userIds) {
    if (await UserWiki.rebuild(userId)) {
      built++;
      const preference = await UserWiki.preference(userId);
      const top = preference?.categories.slice(0, 3).map((a) => `${a.name} ${Math.round(a.share * 100)}%`).join(', ');
      console.log(`user ${userId}: ${preference?.signals} signal(s), ${preference?.clicked.length} opened${top ? `; ${top}` : ''}`);
    } else {
      console.log(`user ${userId}: no such user`);
    }
  }
  console.log(`built ${built} user wiki(s)`);
  if (flags.out) {
    const files = await UserWiki.bundle(flags.user ? userIds : undefined);
    const out = path.resolve(flags.out);
    rmSync(out, { recursive: true, force: true });
    for (const [file, content] of files) {
      const target = path.join(out, file);
      mkdirSync(path.dirname(target), { recursive: true });
      writeFileSync(target, content);
    }
    console.log(`wrote ${files.size} file(s) to ${out}`);
  }
}

run()
  .catch((err) => {
    console.log('user-wiki:build failed:', err);
    process.exitCode = 1;
  })
  .finally(() => db.closeConnection());
