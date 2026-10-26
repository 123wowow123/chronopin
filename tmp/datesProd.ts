// Sends the review sentiment scores stored locally (npm run reviews:sentiment,
// or hand-scored) to a running server (production by default). This machine's
// pin ids are not the server's, so each pin is found there by its sourceUrl
// (GET /api/admin/db/Pin?sourceUrl=...); one that is missing or ambiguous is
// skipped and reported.
//
// Only the sentiment field travels: the server's own reviews are read, each
// review with no score gets the local score of the same url, and the column is
// patched through the admin table API (PATCH /api/admin/db/<Table>?pinId=...),
// so nothing else in a rubric - scores, basis, a hand-set source - is replaced.
//
// Sign-in is the other prod scripts': the saved admin token (.scrape/admin.token
// for www.chronopin.com) while valid, otherwise flynni2008@gmail.com with a
// password typed at the prompt (not echoed, not stored).
//
//   npm run reviews:sentiment:prod                  all scored reviews to www.chronopin.com
//   npm run reviews:sentiment:prod -- --dry         find the pins, patch nothing
//   npm run reviews:sentiment:prod -- --base http://localhost:3000

import '../scripts/env';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import * as db from '@/server/db';
import type { PinReview } from '@/lib/pinReviews';

const TABLES = ['PinTaste', 'PinCarPerf', 'PinGasCarPerf', 'PinAircraftPerf', 'PinLlmPerf', 'PinVideoPerf', 'PinHotel', 'PinDining'];

const { values: flags } = parseArgs({ options: { dry: { type: 'boolean', default: false }, base: { type: 'string' } } });
const BASE = (flags.base ?? 'https://www.chronopin.com').replace(/\/$/, '');
const EMAIL = 'flynni2008@gmail.com';

async function call(method: string, route: string, token?: string, body?: unknown) {
  const res = await fetch(BASE + route, {
    method,
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'chronopin-review-sentiment/1.0', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
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

  const problems: string[] = [];
  let patched = 0;
  let scored = 0;
  let rowsSeen = 0;
  for (const table of TABLES) {
    const rows = await db.query<{ pinId: number; title: string; sourceUrl: string | null; reviews: PinReview[] }>(
      `SELECT t."pinId", p."title", p."sourceUrl", t."reviews" FROM "${table}" t JOIN "Pin" p ON p."id" = t."pinId"
       WHERE p."utcDeletedDateTime" IS NULL AND EXISTS (SELECT 1 FROM jsonb_array_elements(t."reviews") r WHERE r->>'sentiment' IS NOT NULL) ORDER BY t."pinId"`,
    );
    for (const row of rows) {
      rowsSeen++;
      if (!row.sourceUrl) {
        problems.push(`${table} local pin ${row.pinId}: has no sourceUrl`);
        continue;
      }
      const found = await call('GET', `/api/admin/db/Pin?sourceUrl=${encodeURIComponent(row.sourceUrl)}&utcDeletedDateTime.null=true&limit=5`, token);
      const matches: { id: number }[] = found.data?.rows ?? [];
      if (found.status !== 200 || matches.length !== 1) {
        problems.push(`${table} ${row.title}: ${matches.length} pins on the server with that sourceUrl (status ${found.status}), skipped`);
        continue;
      }
      const id = matches[0].id;
      const there = await call('GET', `/api/admin/db/${table}?pinId=${id}&limit=1`, token);
      const remote = there.data?.rows?.[0] as { reviews: PinReview[] | string } | undefined;
      if (there.status !== 200 || !remote) {
        problems.push(`${table} ${row.title}: no ${table} row on the server for pin ${id}, skipped`);
        continue;
      }
      const reviews: PinReview[] = typeof remote.reviews === 'string' ? JSON.parse(remote.reviews) : remote.reviews;
      const local = new Map(row.reviews.filter((r) => r.publishedDate).map((r) => [r.url, r.publishedDate as string]));
      let changed = 0;
      for (const review of reviews) {
        const value = local.get(review.url);
        if (!review.publishedDate && value != null) {
          review.publishedDate = value;
          changed++;
        }
      }
      if (!changed) continue;
      console.log(`${table} ${row.title}: local ${row.pinId} -> pin ${id}, ${changed} review(s)`);
      scored += changed;
      if (flags.dry) continue;
      const patch = await call('PATCH', `/api/admin/db/${table}?pinId=${id}`, token, { reviews });
      if (patch.status !== 200) {
        problems.push(`${table} ${row.title}: PATCH answered ${patch.status} ${JSON.stringify(patch.data).slice(0, 200)}`);
        continue;
      }
      patched++;
    }
  }
  for (const line of problems) console.log(`problem: ${line}`);
  console.log(`${rowsSeen} local rows with scores: ${flags.dry ? 'dry run' : `${patched} patched`}, ${scored} review score(s), ${problems.length} problems`);
  return problems.length ? 1 : 0;
}
run()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error(err.message ?? err);
    process.exit(1);
  });
