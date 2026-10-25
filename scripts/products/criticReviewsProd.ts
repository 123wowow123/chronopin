// Sends the critic reviews stored locally in PinCriticReview (0215: pins with
// no rubric table of their own - games, films, albums) to a running server
// (production by default). This machine's pin ids are not the server's, so
// each pin is found there by its sourceUrl (GET /api/admin/db/Pin?sourceUrl=...);
// one that is missing or ambiguous is skipped and reported. The reviews are
// merged by url into what the server already has, and written through the
// admin table API (POST /api/admin/db/PinCriticReview?upsert=1). A row set by
// hand on the server is left alone.
//
// Needs migration 0215 applied on the server (a deploy runs it). Sign-in is the
// other prod scripts': the saved admin token (.scrape/admin.token for
// www.chronopin.com) while valid, otherwise flynni2008@gmail.com with a
// password typed at the prompt (not echoed, not stored).
//
//   npm run reviews:critic:prod                  all rows to www.chronopin.com
//   npm run reviews:critic:prod -- --dry         find the pins, write nothing
//   npm run reviews:critic:prod -- --base http://localhost:3000

import '../env';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import * as db from '@/server/db';
import type { PinReview } from '@/lib/pinReviews';

const { values: flags } = parseArgs({ options: { dry: { type: 'boolean', default: false }, base: { type: 'string' } } });
const BASE = (flags.base ?? 'https://www.chronopin.com').replace(/\/$/, '');
const EMAIL = 'flynni2008@gmail.com';

async function call(method: string, route: string, token?: string, body?: unknown) {
  const res = await fetch(BASE + route, {
    method,
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'chronopin-critic-reviews/1.0', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data: any = text;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // not JSON: the status and the start of the text say enough
  }
  return { status: res.status, data };
}

// A line from the terminal with the typed characters hidden.
function askPassword(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const write = (rl as any)._writeToOutput;
    process.stdout.write(prompt);
    (rl as any)._writeToOutput = (s: string) => {
      if (s.includes('\n') || s.includes('\r')) write.call(rl, s);
    };
    rl.question('', (answer) => {
      rl.close();
      process.stdout.write('\n');
      resolve(answer);
    });
  });
}

async function run() {
  const { host } = new URL(BASE);
  const tokenFile = path.resolve(host === 'www.chronopin.com' ? '.scrape/admin.token' : `.scrape/admin-${host.replace(/\W+/g, '_')}.token`);
  const kept = existsSync(tokenFile) ? readFileSync(tokenFile, 'utf8').trim() : '';
  let token = '';
  // /api/users/me answers 200 with null for an expired token, so the body must name a user.
  if (kept && (await call('GET', '/api/users/me', kept)).data?.id) {
    token = kept;
    console.log(`Signed in with the saved admin token (${path.relative('.', tokenFile)})`);
  } else {
    if (!process.stdin.isTTY) throw new Error(`No valid saved admin token (${path.relative('.', tokenFile)}), and this is not an interactive terminal, which the password prompt needs.`);
    const password = await askPassword(`Password for ${EMAIL} on ${BASE}: `);
    const login = await call('POST', '/auth/local', undefined, { email: EMAIL, password });
    if (login.status !== 200 || !login.data?.token) throw new Error(`sign-in failed: ${login.status}`);
    token = login.data.token;
    mkdirSync(path.dirname(tokenFile), { recursive: true });
    writeFileSync(tokenFile, token, { mode: 0o600 });
  }

  const rows = await db.query<{ pinId: number; title: string; sourceUrl: string | null; reviews: PinReview[]; basis: string | null }>(
    `SELECT c."pinId", p."title", p."sourceUrl", c."reviews", c."basis" FROM "PinCriticReview" c JOIN "Pin" p ON p."id" = c."pinId"
     WHERE p."utcDeletedDateTime" IS NULL AND c."source" = 'session' AND jsonb_array_length(c."reviews") > 0 ORDER BY c."pinId"`,
  );
  const problems: string[] = [];
  let written = 0;
  for (const row of rows) {
    if (!row.sourceUrl) {
      problems.push(`local pin ${row.pinId}: has no sourceUrl`);
      continue;
    }
    const found = await call('GET', `/api/admin/db/Pin?sourceUrl=${encodeURIComponent(row.sourceUrl)}&utcDeletedDateTime.null=true&limit=5`, token);
    const matches: { id: number }[] = found.data?.rows ?? [];
    if (found.status !== 200 || matches.length !== 1) {
      problems.push(`${row.title}: ${matches.length} pins on the server with that sourceUrl (status ${found.status}), skipped`);
      continue;
    }
    const id = matches[0].id;
    const there = await call('GET', `/api/admin/db/PinCriticReview?pinId=${id}&limit=1`, token);
    if (there.status !== 200) {
      problems.push(`${row.title}: PinCriticReview read answered ${there.status} (is migration 0215 deployed?)`);
      continue;
    }
    const remote = there.data?.rows?.[0] as { reviews: PinReview[] | string; source: string } | undefined;
    if (remote?.source === 'hand') {
      problems.push(`${row.title}: the server's reviews were set by hand, left alone`);
      continue;
    }
    const have: PinReview[] = remote ? (typeof remote.reviews === 'string' ? JSON.parse(remote.reviews) : remote.reviews) : [];
    const seen = new Set(have.map((r) => r.url));
    const merged = [...have, ...row.reviews.filter((r) => !seen.has(r.url))];
    console.log(`${row.title}: local ${row.pinId} -> ${BASE} pin ${id}, ${merged.length} review(s)`);
    if (flags.dry) continue;
    const put = await call('POST', '/api/admin/db/PinCriticReview?upsert=1', token, { pinId: id, reviews: merged, source: 'session', basis: row.basis });
    if (put.status !== 201 && put.status !== 200) {
      problems.push(`${row.title}: write answered ${put.status} ${JSON.stringify(put.data).slice(0, 200)}`);
      continue;
    }
    written++;
  }
  for (const line of problems) console.log(`problem: ${line}`);
  console.log(`${rows.length} rows: ${flags.dry ? 'dry run' : `${written} written`}, ${problems.length} problems`);
  return problems.length ? 1 : 0;
}
run()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error(err.message ?? err);
    process.exit(1);
  });
