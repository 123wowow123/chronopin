// Pushes the cleaned and researched PinDatacenter cooling / powerSource values
// to production, one PUT /api/pins/:id/datacenter per pin that differs. Only
// the two text fields change: the prod record is read first and sent back
// with them replaced. Prod pins are found by sourceUrl (ids differ from local)
// and must match the local title.
//
// A prod value is overwritten only when it is empty, is the old bare tracker
// text (normalizes to the local value), or the pin is in the applied research
// list; any other difference is reported and left alone.
//
// Usage:
//   npx tsx scripts/power/pushCoolingPowerProd.ts <applied.json> --dry
//   npx tsx scripts/power/pushCoolingPowerProd.ts <applied.json>
import '../env';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { normalizeCooling, normalizePowerSource } from '@/lib/datacenter';
import * as db from '@/server/db';

const { values: flags, positionals } = parseArgs({ options: { dry: { type: 'boolean', default: false }, base: { type: 'string' } }, allowPositionals: true });
const BASE = (flags.base ?? 'https://www.chronopin.com').replace(/\/$/, '');
const EMAIL = 'flynni2008@gmail.com';

async function call(method: string, route: string, token?: string, body?: unknown) {
  const res = await fetch(BASE + route, {
    method,
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'chronopin-datacenter/1.0', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data: any = text;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // non-JSON
  }
  return { status: res.status, data };
}

async function signIn(): Promise<string> {
  const tokenFile = path.resolve('.scrape/admin.token');
  const kept = existsSync(tokenFile) ? readFileSync(tokenFile, 'utf8').trim() : '';
  if (kept && (await call('GET', '/api/users/me', kept)).data?.id) return kept;
  const password = process.env.ADMIN_PASSWORD;
  if (!password) throw new Error('No valid saved admin token and no ADMIN_PASSWORD in .env.local.');
  const login = await call('POST', '/auth/local', undefined, { email: EMAIL, password });
  if (login.status !== 200 || !login.data?.token) throw new Error(`sign-in failed: ${login.status}`);
  return login.data.token as string;
}

type Dc = { cooling: string | null; powerSource: string | null; [k: string]: unknown };

async function main() {
  const researched = new Set<number>((JSON.parse(readFileSync(positionals[0], 'utf8')) as { id: number }[]).map((a) => a.id));
  const token = await signIn();
  const rows = await db.query<{ id: number; title: string; sourceUrl: string | null; cooling: string | null; powerSource: string | null }>(
    `SELECT p."id", p."title", p."sourceUrl", dc."cooling", dc."powerSource" FROM "PinDatacenter" dc JOIN "Pin" p ON p."id" = dc."pinId" WHERE p."utcDeletedDateTime" IS NULL AND p."sourceUrl" IS NOT NULL ORDER BY p."id"`,
  );
  const stats = { pushed: 0, same: 0, noMatch: 0, titleMismatch: 0, kept: 0, failed: 0 };
  const notes: string[] = [];
  const CONCURRENCY = 8;
  for (let i = 0; i < rows.length; i += CONCURRENCY) {
    await Promise.all(
      rows.slice(i, i + CONCURRENCY).map(async (row) => {
        const found = await call('GET', `/api/admin/db/Pin?sourceUrl=${encodeURIComponent(row.sourceUrl!)}&utcDeletedDateTime.null=true&limit=5`, token);
        const matches: { id: number; title: string }[] = found.data?.rows ?? [];
        if (found.status !== 200 || matches.length !== 1) return void stats.noMatch++;
        if (matches[0].title !== row.title) return void stats.titleMismatch++;
        const prodId = matches[0].id;
        const prod = (await call('GET', `/api/pins/${prodId}/datacenter`, token)).data as Dc | null;
        if (!prod) return void stats.noMatch++;
        const next: Dc = { ...prod };
        let changed = false;
        for (const field of ['cooling', 'powerSource'] as const) {
          if (row[field] === prod[field] || row[field] == null) continue;
          const old = prod[field];
          const normalizer = field === 'cooling' ? normalizeCooling : normalizePowerSource;
          const mayReplace = old == null || old === '' || normalizer(old) === row[field] || researched.has(row.id);
          if (!mayReplace) {
            stats.kept++;
            notes.push(`${row.id}->${prodId} ${field}: prod "${old}" kept over local "${row[field]}"`);
            continue;
          }
          next[field] = row[field];
          changed = true;
        }
        if (!changed) return void stats.same++;
        if (flags.dry) return void stats.pushed++;
        const put = await call('PUT', `/api/pins/${prodId}/datacenter`, token, next);
        if (put.status === 200) stats.pushed++;
        else {
          stats.failed++;
          notes.push(`${row.id}->${prodId} PUT ${put.status} ${JSON.stringify(put.data).slice(0, 120)}`);
        }
      }),
    );
  }
  console.log(flags.dry ? 'DRY RUN' : 'DONE', BASE, stats);
  for (const n of notes.slice(0, 40)) console.log(n);
  process.exit(0);
}

main();
