// Sends the competing products stored locally in PinCompetitor (0211) to a
// running server (production by default). This machine's pin ids are not the
// server's, so each pin, and each rival pin a row links to, is found there by
// its sourceUrl (GET /api/admin/db/Pin?sourceUrl=...); one that is missing or
// ambiguous is skipped and reported (a rival with no match is sent unlinked).
// A pin's list is replaced through PUT /api/pins/:id/competitors, so the
// server ends with exactly the local rows.
//
// Sign-in is the other prod scripts': the saved admin token (.scrape/admin.token
// for www.chronopin.com) while valid, otherwise flynni2008@gmail.com with a
// password typed at the prompt (not echoed, not stored).
//
//   npm run products:competitors:prod                 all pins to www.chronopin.com
//   npm run products:competitors:prod -- --dry        find the pins, write nothing
//   npm run products:competitors:prod -- --base http://localhost:3000

import '../env';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import * as db from '@/server/db';

const { values: flags } = parseArgs({ options: { dry: { type: 'boolean', default: false }, base: { type: 'string' } } });
const BASE = (flags.base ?? 'https://www.chronopin.com').replace(/\/$/, '');
const EMAIL = 'flynni2008@gmail.com';

async function call(method: string, route: string, token?: string, body?: unknown) {
  const res = await fetch(BASE + route, {
    signal: AbortSignal.timeout(30_000),
    method,
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'chronopin-competitors/1.0', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
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
  console.log(`Target ${BASE}${flags.dry ? ' (dry run)' : ''}`);
  const { host } = new URL(BASE);
  const tokenFile = path.resolve(host === 'www.chronopin.com' ? '.scrape/admin.token' : `.scrape/admin-${host.replace(/\W+/g, '_')}.token`);
  const kept = existsSync(tokenFile) ? readFileSync(tokenFile, 'utf8').trim() : '';
  let token = '';
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

  type Row = { pinId: number; rank: number; name: string; maker: string | null; summary: string | null; sourceUrl: string | null; competitorPinId: number | null; title: string; pinSource: string | null; rivalSource: string | null };
  const rows = await db.query<Row>(
    `SELECT c."pinId", c."rank", c."name", c."maker", c."summary", c."sourceUrl", c."competitorPinId", p."title", p."sourceUrl" AS "pinSource", w."sourceUrl" AS "rivalSource"
     FROM "PinCompetitor" c JOIN "Pin" p ON p."id" = c."pinId" AND p."utcDeletedDateTime" IS NULL
     LEFT JOIN "Pin" w ON w."id" = c."competitorPinId" AND w."utcDeletedDateTime" IS NULL
     ORDER BY c."pinId", c."rank"`,
  );
  const byPin = new Map<number, Row[]>();
  for (const r of rows) byPin.set(r.pinId, [...(byPin.get(r.pinId) ?? []), r]);

  const cache = new Map<string, number | null>();
  const remoteId = async (sourceUrl: string | null): Promise<number | null> => {
    if (!sourceUrl) return null;
    if (cache.has(sourceUrl)) return cache.get(sourceUrl)!;
    const found = await call('GET', `/api/admin/db/Pin?sourceUrl=${encodeURIComponent(sourceUrl)}&utcDeletedDateTime.null=true&limit=5`, token);
    const matches: { id: number }[] = found.data?.rows ?? [];
    const id = found.status === 200 && matches.length === 1 ? matches[0].id : null;
    cache.set(sourceUrl, id);
    return id;
  };

  // Look every pin and linked rival up first, eight at a time.
  const wanted = [...new Set([...byPin.values()].flatMap((list) => [list[0].pinSource, ...list.map((r) => r.rivalSource)]).filter((u): u is string => !!u))];
  let looked = 0;
  const queue = [...wanted];
  await Promise.all(
    Array.from({ length: 8 }, async () => {
      for (let u = queue.shift(); u; u = queue.shift()) {
        await remoteId(u);
        if (++looked % 100 === 0) console.log(`  looked up ${looked}/${wanted.length} pins on the server`);
      }
    }),
  );
  console.log(`Matched ${[...cache.values()].filter(Boolean).length} of ${wanted.length} pins by sourceUrl`);

  const problems: string[] = [];
  let written = 0;
  let linked = 0;
  for (const [pinId, list] of byPin) {
    const first = list[0];
    const id = await remoteId(first.pinSource);
    if (!id) {
      problems.push(`${first.title} (local ${pinId}): no single pin on the server with its sourceUrl, skipped`);
      continue;
    }
    const body = [];
    for (const r of list) {
      const rival = r.rivalSource ? await remoteId(r.rivalSource) : null;
      if (rival) linked++;
      body.push({ rank: r.rank, name: r.name, maker: r.maker, competitorPinId: rival, summary: r.summary, sourceUrl: r.sourceUrl });
    }
    if (flags.dry) continue;
    const put = await call('PUT', `/api/pins/${id}/competitors`, token, body);
    if (put.status !== 200) {
      problems.push(`${first.title} (local ${pinId} -> ${id}): write answered ${put.status} ${JSON.stringify(put.data).slice(0, 160)}`);
      continue;
    }
    if (++written % 50 === 0) console.log(`  wrote ${written}/${byPin.size} pins`);
  }
  for (const line of problems) console.log(`problem: ${line}`);
  console.log(`${byPin.size} pins: ${flags.dry ? 'dry run' : `${written} written`}, ${linked} rivals linked, ${problems.length} problems`);
  return problems.length ? 1 : 0;
}
run()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error(err.message ?? err);
    process.exit(1);
  });
