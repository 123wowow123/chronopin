// Sends the local pins' route outlines (circuits and courses, PinSiteShape rows
// whose features are kind 'route') to production. Pins are found there by
// sourceUrl, as the other prod scripts do; one the server has none or several of
// is skipped and listed. Needs the saved admin token (.scrape/admin.token): sign
// in with scripts/power/datacenterProd.ts first.
//
//   npx tsx scripts/routes/routesProd.ts --dry     what would be sent
//   npx tsx scripts/routes/routesProd.ts           send

import '../env';
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import * as db from '@/server/db';

const { values: flags } = parseArgs({ options: { dry: { type: 'boolean', default: false }, base: { type: 'string' } } });
const base = (flags.base ?? 'https://www.chronopin.com').replace(/\/$/, '');

async function call(method: string, route: string, token: string, body?: unknown) {
  const res = await fetch(base + route, {
    method,
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'chronopin-routes/1.0', Authorization: `Bearer ${token}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data: any = text;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // not JSON
  }
  return { status: res.status, data };
}

async function main() {
  const local = await db.query<{ id: number; title: string; sourceUrl: string | null; geojson: unknown; source: string; shapeUrl: string | null }>(`
    SELECT p."id", p."title", p."sourceUrl", s."geojson", s."source", s."sourceUrl" AS "shapeUrl"
    FROM "PinSiteShape" s JOIN "Pin" p ON p."id" = s."pinId"
    WHERE p."utcDeletedDateTime" IS NULL AND jsonb_path_exists(s."geojson", '$.features[*] ? (@.properties.kind == "route")')
    ORDER BY p."id"`);
  console.log(`${local.length} local pins with a route`);
  if (flags.dry) return;

  const tokenFile = path.resolve('.scrape/admin.token');
  const token = fs.existsSync(tokenFile) ? fs.readFileSync(tokenFile, 'utf8').trim() : '';
  if (!token || !(await call('GET', '/api/users/me', token)).data?.id) throw new Error('No valid saved admin token: run scripts/power/datacenterProd.ts once to sign in.');
  const check = await call('GET', '/api/admin/db/PinSiteShape?limit=1', token);
  if (check.status !== 200) throw new Error(`PinSiteShape is not on the server yet (${check.status}): deploy migration 0203 first.`);

  const rows: unknown[] = [];
  const problems: string[] = [];
  for (let i = 0; i < local.length; i += 6) {
    await Promise.all(
      local.slice(i, i + 6).map(async (pin) => {
        if (!pin.sourceUrl) return void problems.push(`${pin.id} ${pin.title.slice(0, 50)}: no sourceUrl, skipped`);
        const found = await call('GET', `/api/admin/db/Pin?sourceUrl=${encodeURIComponent(pin.sourceUrl)}&utcDeletedDateTime.null=true&limit=5`, token);
        const matches: { id: number }[] = found.data?.rows ?? [];
        if (matches.length !== 1) return void problems.push(`${pin.id} ${pin.title.slice(0, 50)}: ${matches.length} pins on the server with that sourceUrl, skipped`);
        rows.push({ pinId: matches[0].id, geojson: pin.geojson, source: pin.source, sourceUrl: pin.shapeUrl });
      }),
    );
  }
  for (let i = 0; i < rows.length; i += 25) {
    const res = await call('POST', '/api/admin/db/PinSiteShape?upsert=1', token, rows.slice(i, i + 25));
    if (res.status !== 201) problems.push(`upsert batch ${i}: ${res.status} ${JSON.stringify(res.data).slice(0, 200)}`);
  }
  for (const p of problems) console.log(`problem: ${p}`);
  console.log(`sent ${rows.length} rows, ${problems.length} problems`);
  process.exitCode = problems.length ? 1 : 0;
}

main().then(() => process.exit(process.exitCode ?? 0), (e) => { console.error(e.message ?? e); process.exit(1); });
