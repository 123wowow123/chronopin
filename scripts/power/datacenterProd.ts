// Syncs all local Data Center & AI Legislation pins, PinPower, PinEnergy, and
// PinDatacenter rows to production (https://www.chronopin.com by default).
//
// Usage:
//   npx tsx scripts/power/datacenterProd.ts --dry
//   npx tsx scripts/power/datacenterProd.ts

import '../env';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
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
      'User-Agent': 'chronopin-datacenter/1.0',
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

async function run() {
  const token = await signIn();
  const checkTable = await call('GET', '/api/admin/db/PinDatacenter?limit=1', token);
  if (checkTable.status !== 200) {
    throw new Error(
      `Server /api/admin/db/PinDatacenter returned ${checkTable.status}: ${JSON.stringify(checkTable.data).slice(0, 200)}`,
    );
  }
  console.log(`Connected to ${BASE}; PinDatacenter table currently has ${checkTable.data?.total ?? 0} rows on server.`);

  // Load all local pins that have a PinDatacenter row OR are tagged 'AI Data Center Legislation'
  const localPins = await db.query<any>(`
    SELECT
      p."id" AS "localId",
      p."title",
      p."description",
      p."longFormSummary",
      p."sourceUrl",
      p."address",
      ST_Y(p."location"::geometry) AS "latitude",
      ST_X(p."location"::geometry) AS "longitude",
      c."name" AS "companyName",
      p."price"::float8 AS "price",
      p."priceCurrency",
      p."dateConfidence",
      p."dateConfidenceReasoning",
      p."utcStartDateTime",
      p."allDay",
      ARRAY(SELECT pt."name"::text FROM "PinTag" pt WHERE pt."pinId" = p."id" AND pt."kind" = 'category' ORDER BY pt."id") AS "categories",
      ARRAY(SELECT pt."name"::text FROM "PinTag" pt WHERE pt."pinId" = p."id" AND pt."kind" <> 'category' ORDER BY pt."id") AS "tags",
      pw."megawatts"::float8 AS "megawatts",
      pw."kind" AS "powerKind",
      pw."source" AS "powerSourceKind",
      pw."sourceUrl" AS "powerSourceUrl",
      pw."note" AS "powerNote",
      pe."gwh"::float8 AS "gwh",
      pe."basis" AS "energyBasis",
      pe."sourceUrl" AS "energySourceUrl",
      pe."note" AS "energyNote",
      dc."pinId" IS NOT NULL AS "hasDc",
      dc."waterGallonsPerDay"::float8 AS "waterGallonsPerDay",
      dc."waterBasis",
      dc."chips"::float8 AS "chips",
      dc."chipModel",
      dc."h100Equivalents"::float8 AS "h100Equivalents",
      dc."acres"::float8 AS "acres",
      dc."sqft"::float8 AS "sqft",
      dc."buildings",
      dc."generators",
      dc."cooling",
      dc."powerSource",
      dc."sourceUrl" AS "dcSourceUrl",
      dc."note" AS "dcNote"
    FROM "Pin" p
    LEFT JOIN "Company" c ON c."id" = p."companyId"
    LEFT JOIN "PinPower" pw ON pw."pinId" = p."id"
    LEFT JOIN "PinEnergy" pe ON pe."pinId" = p."id"
    LEFT JOIN "PinDatacenter" dc ON dc."pinId" = p."id"
    WHERE p."utcDeletedDateTime" IS NULL
      AND (
        dc."pinId" IS NOT NULL
        OR EXISTS (SELECT 1 FROM "PinTag" pt WHERE pt."pinId" = p."id" AND pt."name" = 'AI Data Center Legislation')
      )
    ORDER BY p."id" ASC
  `);

  console.log(`Loaded ${localPins.length} local Datacenter & AI Legislation pins to sync.`);

  const prodIdByLocalId = new Map<number, number>();
  const toCreate: any[] = [];

  // Resolve existing pins on prod in parallel chunks of 12
  const CONCURRENCY = 12;
  for (let i = 0; i < localPins.length; i += CONCURRENCY) {
    const slice = localPins.slice(i, i + CONCURRENCY);
    await Promise.all(
      slice.map(async (row) => {
        if (row.sourceUrl) {
          const found = await call(
            'GET',
            `/api/admin/db/Pin?sourceUrl=${encodeURIComponent(row.sourceUrl)}&utcDeletedDateTime.null=true&limit=5`,
            token,
          );
          const matches: { id: number }[] = found.data?.rows ?? [];
          if (found.status === 200 && matches.length === 1) {
            prodIdByLocalId.set(row.localId, matches[0].id);
            return;
          }
        }
        // Fallback to exact title match
        const byTitle = await call(
          'GET',
          `/api/admin/db/Pin?title=${encodeURIComponent(row.title)}&utcDeletedDateTime.null=true&limit=5`,
          token,
        );
        const titleMatches: { id: number }[] = byTitle.data?.rows ?? [];
        if (byTitle.status === 200 && titleMatches.length === 1) {
          prodIdByLocalId.set(row.localId, titleMatches[0].id);
          return;
        }
        toCreate.push(row);
      }),
    );
  }

  console.log(`Resolved ${prodIdByLocalId.size} existing pins on prod; ${toCreate.length} new pins to create on prod.`);

  // Create missing pins on prod in batches of 20
  let createdPins = 0;
  const problems: string[] = [];

  if (!flags.dry && toCreate.length > 0) {
    for (let i = 0; i < toCreate.length; i += 20) {
      const batch = toCreate.slice(i, i + 20);
      const bodies = batch.map((row) => ({
        userName: '@TechDesk',
        title: row.title,
        description: row.description,
        longFormSummary: row.longFormSummary,
        sourceUrl: row.sourceUrl,
        address: row.address,
        latitude: row.latitude,
        longitude: row.longitude,
        company: row.companyName ? { name: row.companyName } : undefined,
        price: row.price,
        priceCurrency: row.priceCurrency ?? (row.price != null ? 'USD' : null),
        dateConfidence: row.dateConfidence || 'estimated',
        dateConfidenceReasoning: row.dateConfidenceReasoning,
        utcStartDateTime:
          row.utcStartDateTime instanceof Date ? row.utcStartDateTime.toISOString() : String(row.utcStartDateTime),
        allDay: row.allDay ?? true,
        categories: row.categories?.length ? row.categories : ['Infrastructure', 'AI', 'Energy'],
        tags: row.tags ?? ['Data Centers'],
        references: row.sourceUrl
          ? [
              {
                url: row.sourceUrl,
                title: row.title,
                confidence: 88,
                reasoning: row.dateConfidenceReasoning || 'Verified datacenter / legislation tracker source',
              },
            ]
          : [],
      }));

      const res = await call('POST', '/api/admin/db/Pin', token, bodies);
      const results: any[] = res.data?.results ?? [];
      for (let idx = 0; idx < batch.length; idx++) {
        const r = results[idx];
        const row = batch[idx];
        if (r && typeof r.id === 'number') {
          prodIdByLocalId.set(row.localId, r.id);
          createdPins++;
        } else {
          // If rejected because of duplicate sourceUrl on prod, look it up again
          const retry = row.sourceUrl
            ? await call('GET', `/api/admin/db/Pin?sourceUrl=${encodeURIComponent(row.sourceUrl)}&limit=2`, token)
            : null;
          if (retry?.data?.rows?.[0]?.id) {
            prodIdByLocalId.set(row.localId, retry.data.rows[0].id);
          } else {
            problems.push(`create pin "${row.title.slice(0, 60)}": ${r?.error ?? JSON.stringify(res.data).slice(0, 160)}`);
          }
        }
      }
      console.log(`Created batch ${Math.floor(i / 20) + 1}/${Math.ceil(toCreate.length / 20)} (${createdPins} pins created so far)`);
    }
  }

  // Build PinPower, PinEnergy, and PinDatacenter upsert payloads mapped to prod pinIds
  const powerRows: any[] = [];
  const energyRows: any[] = [];
  const dcRows: any[] = [];
  const seenProdIds = new Set<number>();

  for (const row of localPins) {
    const prodId = prodIdByLocalId.get(row.localId);
    if (!prodId || seenProdIds.has(prodId)) continue;
    seenProdIds.add(prodId);

    if (row.megawatts != null && row.megawatts > 0) {
      powerRows.push({
        pinId: prodId,
        megawatts: row.megawatts,
        kind: row.powerKind || 'usage',
        source: row.powerSourceKind || 'hand',
        sourceUrl: row.powerSourceUrl || row.sourceUrl || null,
        note: row.powerNote || null,
      });
    }
    if (row.gwh != null && row.gwh > 0) {
      energyRows.push({
        pinId: prodId,
        gwh: row.gwh,
        basis: row.energyBasis || 'calculated',
        sourceUrl: row.energySourceUrl || row.sourceUrl || null,
        note: row.energyNote || 'Calculated at 60% load factor',
        checkedAt: '2026-10-21',
      });
    }
    if (row.hasDc) {
      dcRows.push({
        pinId: prodId,
        waterGallonsPerDay: row.waterGallonsPerDay ?? null,
        waterBasis: row.waterBasis ?? null,
        chips: row.chips != null ? Math.round(row.chips) : null,
        chipModel: row.chipModel ?? null,
        h100Equivalents: row.h100Equivalents ?? null,
        acres: row.acres ?? null,
        sqft: row.sqft != null ? Math.round(row.sqft) : null,
        buildings: row.buildings ?? null,
        generators: row.generators ?? null,
        cooling: row.cooling ?? null,
        powerSource: row.powerSource ?? null,
        sourceUrl: row.dcSourceUrl || row.sourceUrl || null,
        note: row.dcNote ?? null,
      });
    }
  }

  console.log(
    `Prepared for prod upsert: ${powerRows.length} PinPower rows, ${energyRows.length} PinEnergy rows, ${dcRows.length} PinDatacenter rows.`,
  );

  if (!flags.dry) {
    for (let i = 0; i < powerRows.length; i += 200) {
      const chunk = powerRows.slice(i, i + 200);
      const r = await call('POST', '/api/admin/db/PinPower?upsert=1', token, chunk);
      if (r.status !== 201) problems.push(`PinPower upsert batch ${i}: status ${r.status} ${JSON.stringify(r.data).slice(0, 200)}`);
    }
    for (let i = 0; i < energyRows.length; i += 200) {
      const chunk = energyRows.slice(i, i + 200);
      const r = await call('POST', '/api/admin/db/PinEnergy?upsert=1', token, chunk);
      if (r.status !== 201) problems.push(`PinEnergy upsert batch ${i}: status ${r.status} ${JSON.stringify(r.data).slice(0, 200)}`);
    }
    for (let i = 0; i < dcRows.length; i += 200) {
      const chunk = dcRows.slice(i, i + 200);
      const r = await call('POST', '/api/admin/db/PinDatacenter?upsert=1', token, chunk);
      if (r.status !== 201) problems.push(`PinDatacenter upsert batch ${i}: status ${r.status} ${JSON.stringify(r.data).slice(0, 200)}`);
    }
  }

  const finalCheck = await call('GET', '/api/admin/db/PinDatacenter?limit=1', token);
  for (const p of problems) console.log(`problem: ${p}`);
  console.log(
    `Done: ${createdPins} new pins created on prod, ${dcRows.length} PinDatacenter rows synced (server PinDatacenter total now: ${finalCheck.data?.total ?? '?'}), ${problems.length} problems.`,
  );
  return problems.length ? 1 : 0;
}

run()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error(err.message ?? err);
    process.exit(1);
  });

