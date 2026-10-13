// Sends the hotel rubrics stored in the local PinHotel table to a running
// server (production by default): PUT /api/pins/:id/hotel. This machine's pin
// ids are not the server's, so each pin is found there by its sourceUrl
// (GET /api/admin/db/Pin?sourceUrl=...); one that is missing or ambiguous is
// skipped and reported. Rows whose source is 'hand' locally are sent as 'hand'.
//
// Sign-in is the dining script's: the saved admin token (.scrape/admin.token
// for www.chronopin.com) while valid, otherwise flynni2008@gmail.com with a
// password typed at the prompt (not echoed, not stored). A fresh token is saved
// to that file (mode 600) for the next run.
//
//   npm run hotels:rubric:prod                      all rows to www.chronopin.com
//   npm run hotels:rubric:prod -- --dry             find the pins, send nothing
//   npm run hotels:rubric:prod -- --base http://localhost:3000
//
// Needs migration 0174 applied on the server (deploys run it).

import '../env';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import * as db from '@/server/db';
import { HOTEL_KEYS } from '@/lib/pinHotel';

const { values: flags } = parseArgs({ options: { dry: { type: 'boolean', default: false }, base: { type: 'string' } } });
const BASE = (flags.base ?? 'https://www.chronopin.com').replace(/\/$/, '');
const EMAIL = 'flynni2008@gmail.com';

async function call(method: string, route: string, token?: string, body?: unknown) {
  const res = await fetch(BASE + route, {
    method,
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'chronopin-hotels/1.0', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
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
    // Kept for the next run, as the other prod scripts keep theirs (.scrape is gitignored).
    mkdirSync(path.dirname(tokenFile), { recursive: true });
    writeFileSync(tokenFile, token, { mode: 0o600 });
  }

  const rows = await db.query<Record<string, unknown> & { pinId: number; sourceUrl: string | null }>(
    `SELECT h."pinId", ${HOTEL_KEYS.map((k) => `h."${k}"::float8 AS "${k}"`).join(', ')}, h."reviews", h."source", h."basis", h."sourceUrl" AS "rubricSourceUrl", p."sourceUrl", p."title"
     FROM "PinHotel" h JOIN "Pin" p ON p."id" = h."pinId" WHERE p."utcDeletedDateTime" IS NULL ORDER BY h."pinId"`,
  );
  let sent = 0;
  const problems: string[] = [];
  for (const row of rows as any[]) {
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
    console.log(`${row.title}: local ${row.pinId} -> ${BASE} pin ${id}`);
    if (flags.dry) continue;
    const body = {
      ...Object.fromEntries(HOTEL_KEYS.map((k) => [k, row[k]])),
      reviews: row.reviews,
      source: row.source,
      basis: row.basis ?? null,
      sourceUrl: row.rubricSourceUrl ?? null,
    };
    const put = await call('PUT', `/api/pins/${id}/hotel`, token, body);
    if (put.status !== 200) {
      problems.push(`${row.title}: rubric PUT answered ${put.status} ${JSON.stringify(put.data).slice(0, 200)}`);
      continue;
    }
    sent++;
  }
  for (const line of problems) console.log(`problem: ${line}`);
  console.log(`${rows.length} rows: ${flags.dry ? 'dry run' : `${sent} sent`}, ${problems.length} problems`);
  return problems.length ? 1 : 0;
}
run()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error(err.message ?? err);
    process.exit(1);
  });
