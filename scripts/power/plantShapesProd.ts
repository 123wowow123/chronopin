// Sends the power-plant outlines kept in .scrape/plant-shapes/ (scripts/power/plantShapes.ts)
// to production's PinSiteShape. Production pins are found by the local pin's sourceUrl,
// as scripts/power/siteShapes.ts --prod does; a pin with no single match there is skipped.
//
//   npx tsx scripts/power/plantShapesProd.ts --dry
//   npx tsx scripts/power/plantShapesProd.ts

import '../env';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import * as db from '@/server/db';


const { values: flags } = parseArgs({
  options: {
    dry: { type: 'boolean', default: false },
    base: { type: 'string' },
  },
});
const BASE = (flags.base ?? 'https://www.chronopin.com').replace(/\/$/, '');
const EMAIL = 'flynni2008@gmail.com';

async function call(method: string, route: string, token?: string, body?: unknown) {
  const res = await fetch(BASE + route, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'chronopin-siteshape/1.0',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
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
  const { host } = new URL(BASE);
  const tokenFile = path.resolve(
    host === 'www.chronopin.com' ? '.scrape/admin.token' : `.scrape/admin-${host.replace(/\W+/g, '_')}.token`,
  );
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

async function main() {
  const token = await signIn();
  const check = await call('GET', '/api/admin/db/PinSiteShape?limit=1', token);
  if (check.status !== 200) throw new Error(`PinSiteShape is not on the server yet (${check.status}): deploy migration 0203 first.`);
  const dir = '.scrape/plant-shapes/';
  const rows: any[] = [];
  const problems: string[] = [];
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) {
    const id = Number(f.replace('.json', ''));
    const [pin] = await db.query<{ title: string; sourceUrl: string | null }>(`SELECT "title", "sourceUrl" FROM "Pin" WHERE "id" = $1 AND "utcDeletedDateTime" IS NULL`, [id]);
    if (!pin?.sourceUrl) { problems.push(`${id}: no local pin or sourceUrl, skipped`); continue; }
    const found = await call('GET', `/api/admin/db/Pin?sourceUrl=${encodeURIComponent(pin.sourceUrl)}&utcDeletedDateTime.null=true&limit=5`, token);
    const matches: { id: number }[] = found.data?.rows ?? [];
    if (matches.length !== 1) { problems.push(`${pin.title.slice(0, 60)}: ${matches.length} pins on the server with that sourceUrl, skipped`); continue; }
    const shape = JSON.parse(readFileSync(dir + f, 'utf8'));
    rows.push({ pinId: matches[0].id, geojson: shape.geojson, source: shape.source, sourceUrl: shape.sourceUrl });
    console.log(`${id} -> prod ${matches[0].id}\n   local: ${pin.title.slice(0, 70)}\n   prod:  ${String((matches[0] as any).title ?? '').slice(0, 70)}`);
  }
  if (!flags.dry) {
    const res = rows.length ? await call('POST', '/api/admin/db/PinSiteShape?upsert=1', token, rows) : { status: 201, data: null };
    if (res.status !== 201) problems.push(`upsert: ${res.status} ${JSON.stringify(res.data).slice(0, 200)}`);
    const after = await call('GET', '/api/admin/db/PinSiteShape?limit=1', token);
    console.log(`server PinSiteShape total now ${after.data?.total}`);
  }
  for (const p of problems) console.log(`problem: ${p}`);
  console.log(`${flags.dry ? 'would send' : 'sent'} ${rows.length} rows, ${problems.length} problems`);
  process.exitCode = problems.length ? 1 : 0;
}

main().then(() => process.exit(process.exitCode ?? 0), (e) => { console.error(e.message); process.exit(1); });
