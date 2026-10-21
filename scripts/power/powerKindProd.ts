// Sends the kind of every local PinPower row (generation / usage / storage) to a
// running server (production by default). This machine's pin ids are not the
// server's, so each pin is found there by its sourceUrl
// (GET /api/admin/db/Pin?sourceUrl=...); one that is missing or ambiguous is
// skipped and reported.
//
// A pin whose server row already has the kind is left alone. One whose row has
// another kind is patched in place (PATCH /api/admin/db/PinPower/:pinId, which
// leaves source untouched). One with no row there is created with
// POST /api/admin/db/PinPower from the local figure and source.
//
// Sign-in: the saved admin token while valid, otherwise flynni2008@gmail.com
// with ADMIN_PASSWORD from .env.local.
//
//   npx tsx scripts/power/powerKindProd.ts --dry
//   npx tsx scripts/power/powerKindProd.ts
//
// Needs migrations 0200 and 0201 applied on the server (deploys run them).

import '../env';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import * as db from '@/server/db';

const { values: flags } = parseArgs({ options: { dry: { type: 'boolean', default: false }, base: { type: 'string' } } });
const BASE = (flags.base ?? 'https://www.chronopin.com').replace(/\/$/, '');
const EMAIL = 'flynni2008@gmail.com';

async function call(method: string, route: string, token?: string, body?: unknown) {
  const res = await fetch(BASE + route, {
    method,
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'chronopin-power/1.0', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
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

async function signIn() {
  const { host } = new URL(BASE);
  const tokenFile = path.resolve(host === 'www.chronopin.com' ? '.scrape/admin.token' : `.scrape/admin-${host.replace(/\W+/g, '_')}.token`);
  const kept = existsSync(tokenFile) ? readFileSync(tokenFile, 'utf8').trim() : '';
  if (kept && (await call('GET', '/api/users/me', kept)).data?.id) return kept;
  const password = process.env.ADMIN_PASSWORD;
  if (!password) throw new Error('No valid saved admin token and no ADMIN_PASSWORD in .env.local.');
  const login = await call('POST', '/auth/local', undefined, { email: EMAIL, password });
  if (login.status !== 200 || !login.data?.token) throw new Error(`sign-in failed: ${login.status}`);
  mkdirSync(path.dirname(tokenFile), { recursive: true });
  writeFileSync(tokenFile, login.data.token, { mode: 0o600 });
  return login.data.token as string;
}

async function run() {
  const token = await signIn();
  const rows = await db.query<any>(
    `SELECT w."pinId", w."megawatts"::float8 AS "megawatts", w."kind", w."source", w."sourceUrl" AS "powerSourceUrl", w."note", p."sourceUrl", p."title"
     FROM "PinPower" w JOIN "Pin" p ON p."id" = w."pinId" WHERE p."utcDeletedDateTime" IS NULL ORDER BY w."pinId"`,
  );
  const counts = { same: 0, patched: 0, created: 0 };
  const problems: string[] = [];
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
    const there = await call('GET', `/api/pins/${id}/power`, token);
    if (there.status === 200 && !there.data?.kind) throw new Error('The server has no PinPower.kind yet: deploy first (migrations 0200, 0201).');
    if (there.status === 200 && there.data.kind === row.kind) {
      counts.same++;
      continue;
    }
    const action = there.status === 200 ? 'patch' : 'create';
    console.log(`${action} ${row.kind}: local ${row.pinId} -> pin ${id} ${row.title.slice(0, 70)}`);
    if (flags.dry) continue;
    const res =
      action === 'patch'
        ? await call('PATCH', `/api/admin/db/PinPower/${id}`, token, { kind: row.kind })
        : // Inserted as a row, so a 'title' reading stays one (PUT would make it 'hand').
          await call('POST', '/api/admin/db/PinPower', token, { pinId: id, megawatts: row.megawatts, kind: row.kind, source: row.source, sourceUrl: row.powerSourceUrl, note: row.note });
    if (res.status !== 200 && res.status !== 201) {
      problems.push(`${row.title}: ${action} answered ${res.status} ${JSON.stringify(res.data).slice(0, 200)}`);
      continue;
    }
    counts[action === 'patch' ? 'patched' : 'created']++;
  }
  for (const line of problems) console.log(`problem: ${line}`);
  console.log(`${rows.length} local rows: ${counts.same} already right, ${counts.patched} patched, ${counts.created} created${flags.dry ? ' (dry run: nothing sent)' : ''}, ${problems.length} problems`);
  return problems.length ? 1 : 0;
}
run()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error(err.message ?? err);
    process.exit(1);
  });
