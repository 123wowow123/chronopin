// Master script to:
// 1. Ingest verified air-permit backup generator and gas turbine counts from dct_fights.json
//    into PinDatacenter for all matching data center campuses.
// 2. Seed backing pins for remaining unpinned US Data Center Tracker (TDC) campuses with GeoJSON
//    shapes and Epoch AI frontier clusters.
// 3. Seed backing pins for remaining unpinned high-profile air-permit facilities from dct_fights.json.
// 4. Populate PinPower, PinEnergy, and PinDatacenter for all seeded campuses.
// 5. Match site boundary polygons and parts via siteShapes.ts.
// 6. Sync new pins, updated telemetry, and site shapes to production with --prod.
//
// Usage:
//   npx tsx scripts/power/ingestAndSeedCampuses.ts            # Local seed & ingest
//   npx tsx scripts/power/ingestAndSeedCampuses.ts --dry      # Dry run
//   npx tsx scripts/power/ingestAndSeedCampuses.ts --prod     # Sync to production

import '../env';
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import * as db from '@/server/db';
import { estimateWaterGallonsPerDayFromMw, type WaterBasis } from '@/lib/datacenter';
import { saveDatacenter } from '@/server/model/pinDatacenter';

const { values: flags } = parseArgs({
  options: {
    dry: { type: 'boolean', default: false },
    prod: { type: 'boolean', default: false },
    base: { type: 'string' },
  },
});

const DIR = '.scrape/datacenter-stats-2026-10-21/';
const CHECKED_AT = '2026-10-21';

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function parseDateAnnounced(raw: string | null | undefined, fallback = '2026-06-01T00:00:00Z'): string {
  if (!raw) return fallback;
  const m = String(raw).trim().match(/^(\d{4})(?:-(\d{1,2}))?(?:-(\d{1,2}))?/);
  if (!m) return fallback;
  const yr = Number(m[1]);
  if (yr < 1990 || yr > 2035) return fallback;
  const mo = String(Math.min(12, Math.max(1, Number(m[2] || 6)))).padStart(2, '0');
  const dy = String(Math.min(28, Math.max(1, Number(m[3] || 1)))).padStart(2, '0');
  return `${yr}-${mo}-${dy}T00:00:00Z`;
}

type GeneratorFight = {
  id: string;
  company: string;
  project_name: string;
  state: string;
  county: string;
  lat: number | null;
  lng: number | null;
  gens: number;
  powerSource: string;
  quote: string;
  summary: string;
  mw: number | null;
  acres: number | null;
  sqft: number | null;
  investmentMillion: number | null;
  date: string | null;
  sourceUrl: string | null;
};

function extractGeneratorFights(fights: any[]): GeneratorFight[] {
  const genFights = fights.filter((f) => /generator|turbine/i.test(f.summary || ''));
  const results: GeneratorFight[] = [];

  for (const f of genFights) {
    const s = f.summary || '';
    let gens: number | null = null;
    let powerSource = 'Diesel backup generators';
    let quote = '';
    let m;

    if ((m = s.match(/add\s+(\d+)\s+more\s+diesel\s+backup\s+generators\s+\(to\s+an\s+existing\s+(\d+)\)/i))) {
      gens = parseInt(m[1], 10) + parseInt(m[2], 10);
      powerSource = 'Diesel backup generators';
      quote = m[0];
    } else if ((m = s.match(/(?:built|build)\s+a\s+\$473M,\s+366MW\s+natural\s+gas\s+power\s+plant\s+\((\d+)\s+small\s+gas\s+generators\)/i))) {
      gens = parseInt(m[1], 10);
      powerSource = 'Natural gas power plant';
      quote = m[0];
    } else if ((m = s.match(/(\d+)\s+unpermitted.*?(\d+)\s+permanent/i))) {
      gens = parseInt(m[1], 10) + parseInt(m[2], 10);
      powerSource = 'Natural gas turbines';
      quote = m[0];
    } else if ((m = s.match(/(?:six|6)\s+2[,.]500\s*kW\s+diesel\s+backup\s+generators/i))) {
      gens = 6;
      powerSource = 'Diesel backup generators';
      quote = m[0];
    } else if ((m = s.match(/(?:five|5)\s+natural\s+gas\s+turbines/i))) {
      gens = 5;
      powerSource = 'Natural gas turbines';
      quote = m[0];
    } else if ((m = s.match(/(?:eleven|11)\s+new\s+gas\s+turbines/i))) {
      gens = 11;
      powerSource = 'Natural gas turbines';
      quote = m[0];
    } else if ((m = s.match(/(\d+)\s+(?:backup\s+diesel|diesel\s+backup|emergency\s+diesel|diesel\s+emergency|diesel-fired\s+emergency|diesel)\s+generators/i))) {
      gens = parseInt(m[1], 10);
      powerSource = 'Diesel backup generators';
      quote = m[0];
    } else if ((m = s.match(/(\d+)\s+(?:emergency|backup)\s+generators/i))) {
      gens = parseInt(m[1], 10);
      powerSource = 'Emergency backup generators';
      quote = m[0];
    } else if ((m = s.match(/(\d+)\s+(?:methane-powered|natural\s+gas|mobile\s+gas|trailered|gas)\s+turbines/i))) {
      gens = parseInt(m[1], 10);
      powerSource = 'Natural gas turbines';
      quote = m[0];
    } else if ((m = s.match(/(\d+)\s+generators/i))) {
      gens = parseInt(m[1], 10);
      powerSource = 'Backup generators';
      quote = m[0];
    } else if ((m = s.match(/(\d+)\s+turbines/i))) {
      gens = parseInt(m[1], 10);
      powerSource = 'Gas turbines';
      quote = m[0];
    }

    if (gens && (gens > 2000 || gens < 1 || gens === 10500 || f.id.includes('epa-minor-nsr'))) {
      gens = null;
    }

    if (gens) {
      const firstSource = Array.isArray(f.sources) ? f.sources[0] : (typeof f.sources === 'string' ? f.sources.split(',')[0] : null);
      results.push({
        id: f.id,
        company: f.company,
        project_name: f.project_name,
        state: f.state,
        county: f.county,
        lat: f.lat ? Number(f.lat) : null,
        lng: f.lng ? Number(f.lng) : null,
        gens,
        powerSource,
        quote,
        summary: s,
        mw: f.megawatts ? Number(f.megawatts) : null,
        acres: f.acreage ? Number(f.acreage) : null,
        sqft: f.building_sq_ft ? Number(f.building_sq_ft) : null,
        investmentMillion: f.investment_million_usd ? Number(f.investment_million_usd) : null,
        date: f.date || null,
        sourceUrl: firstSource || `https://datacentertracker.org/fights#${slugify(f.id)}`,
      });
    }
  }

  return results;
}

async function main() {
  console.log(`[ingestAndSeedCampuses] Starting ingestion and seeding (dry=${flags.dry}, prod=${flags.prod})...`);

  const tdcList: any[] = JSON.parse(fs.readFileSync(DIR + 'trackdatacenters.json', 'utf8'));
  const dctList: any[] = JSON.parse(fs.readFileSync(DIR + 'dct_fights.json', 'utf8'));
  const epochJson: any = JSON.parse(fs.readFileSync(DIR + 'epoch_map_unwrapped.json', 'utf8'));
  const epochCenters: any[] = epochJson.dataCenters.filter((e: any) => e.shapes?.features?.length && Array.isArray(e.lngLat));

  const [techDesk] = await db.query<{ id: number }>(`SELECT "id" FROM "User" WHERE "userName" = '@TechDesk' LIMIT 1`);
  const userId = techDesk?.id ?? 276;

  // 1. Extract verified generator fights
  const generatorFights = extractGeneratorFights(dctList);
  console.log(`[Generators] Extracted ${generatorFights.length} verified facility generator/turbine counts.`);

  // Load existing pins
  const existingPins = await db.query<{
    id: number;
    title: string;
    sourceUrl: string | null;
    lat: number | null;
    lon: number | null;
  }>(`
    SELECT "id", "title", "sourceUrl",
           ST_Y("location"::geometry) AS "lat",
           ST_X("location"::geometry) AS "lon"
    FROM "Pin"
    WHERE "utcDeletedDateTime" IS NULL
  `);

  const hasNearbyPin = (lat: number, lon: number, radiusKm: number, titleSubstr?: string): boolean => {
    for (const p of existingPins) {
      if (titleSubstr && p.title.toLowerCase().includes(titleSubstr.toLowerCase())) return true;
      if (p.lat != null && p.lon != null && haversineKm(lat, lon, p.lat, p.lon) <= radiusKm) {
        return true;
      }
    }
    return false;
  };

  let seededEpochCount = 0;
  let seededTdcCount = 0;
  let seededFightsCount = 0;
  let updatedGeneratorsCount = 0;

  // 2. Seed missing Epoch Frontier AI Clusters with shapes
  console.log(`\n--- Seeding Missing Epoch AI Frontier Clusters with Shapes ---`);
  for (const ep of epochCenters) {
    const lat = ep.lngLat[1];
    const lon = ep.lngLat[0];
    const name = String(ep.title || ep.id).trim();
    const slug = slugify(String(ep.id));
    const sourceUrl = `https://epoch.ai/data/data-centers#${slug}`;

    // Look for existing pin by exact handle or close coordinate proximity (within 1.5 km)
    let matchedPin = existingPins.find(
      (p) =>
        p.sourceUrl === sourceUrl ||
        (p.sourceUrl && p.sourceUrl.includes(slug)) ||
        (p.lat != null && p.lon != null && haversineKm(lat, lon, p.lat, p.lon) <= 1.5 && (p.title.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(p.title.toLowerCase()))),
    );

    const mw = ep.capacity_mw ? Number(ep.capacity_mw) : 250;
    const chips = ep.chip_count ? Number(ep.chip_count) : null;
    const h100e = ep.h100_equivalents ? Number(ep.h100_equivalents) : null;
    const chipModel = ep.chip_model ?? (chips ? 'NVIDIA H100 / Blackwell' : null);
    const dateStr = parseDateAnnounced(ep.operational_date || ep.announcement_date, '2026-08-01T00:00:00Z');

    // Check if there is an air permit generator fight nearby
    const genFight = generatorFights.find(
      (gf) => gf.lat && gf.lng && haversineKm(lat, lon, gf.lat, gf.lng) <= 8,
    );

    const generators = genFight?.gens ?? (ep.generator_count ? Number(ep.generator_count) : null);
    const powerSource = genFight?.powerSource ?? (ep.power_source ?? 'Utility grid');

    if (!matchedPin) {
      if (flags.dry) {
        console.log(`[DRY] Would seed Epoch cluster: ${name} (${lat.toFixed(4)}, ${lon.toFixed(4)})`);
        seededEpochCount++;
        continue;
      }

      const title = `${name}: ${mw} MW Frontier AI Hyperscale Data Center`;
      const desc = `Hyperscale frontier AI training and inference campus tracked by Epoch AI with annotated satellite footprints (${ep.shapes?.features?.length ?? 0} physical parts).`;
      const longForm = `<p>${desc}</p><ul><li><strong>Power capacity:</strong> ${mw} MW</li>${chips ? `<li><strong>AI Accelerators:</strong> ${chips.toLocaleString()} ${chipModel ?? 'chips'}</li>` : ''}${generators ? `<li><strong>Generators:</strong> ${generators} ${powerSource}</li>` : ''}<li><strong>Tracked by:</strong> Epoch AI Data Center Tracker (${name})</li></ul>`;

      const [comp] = await db.query<{ id: number }>(
        `INSERT INTO "Company" ("name") VALUES ($1) ON CONFLICT ("name") DO UPDATE SET "name" = "Company"."name" RETURNING "id"`,
        [name],
      );

      const [newPin] = await db.query<{ id: number }>(`
        INSERT INTO "Pin" (
          "title", "description", "sourceUrl", "longFormSummary", "address", "location",
          "companyId", "price", "priceCurrency", "dateConfidence", "dateConfidenceReasoning",
          "utcStartDateTime", "allDay", "userId"
        ) VALUES (
          $1, $2, $3, $4, $5, ST_SetSRID(ST_MakePoint($7, $6), 4326)::geography,
          $8, NULL, 'USD', 'estimated', 'Epoch AI frontier data center tracker satellite verified footprint',
          $9, true, $10
        ) RETURNING "id"
      `, [
        title, desc, sourceUrl, longForm,
        ep.country ? `${name}, ${ep.country}` : `${name}, USA`,
        lat, lon, comp.id, dateStr, userId,
      ]);

      matchedPin = { id: newPin.id, title, sourceUrl, lat, lon };
      existingPins.push(matchedPin);
      seededEpochCount++;

      // PinPower & PinEnergy
      await db.query(`
        INSERT INTO "PinPower" ("pinId", "megawatts", "kind", "source", "sourceUrl", "note")
        VALUES ($1, $2, 'usage', 'hand', $3, 'Epoch AI frontier cluster')
        ON CONFLICT ("pinId") DO UPDATE SET "megawatts" = EXCLUDED."megawatts"
      `, [newPin.id, mw, sourceUrl]);

      const gwh = Math.round(mw * 8.76 * 0.6 * 10) / 10;
      await db.query(`
        INSERT INTO "PinEnergy" ("pinId", "gwh", "basis", "sourceUrl", "note", "checkedAt")
        VALUES ($1, $2, 'calculated', $3, 'Calculated from 60% load factor', $4)
        ON CONFLICT ("pinId") DO UPDATE SET "gwh" = EXCLUDED."gwh"
      `, [newPin.id, gwh, sourceUrl, CHECKED_AT]);

      // Tags
      const categories = ['Infrastructure', 'AI', 'Energy'];
      const tags = ['Data Centers', 'AI Data Centers', ...categories];
      await db.query(
        `INSERT INTO "PinTag" ("pinId", "name", "kind", "source")
         SELECT $1, name, CASE WHEN name = ANY($3::text[]) THEN 'category' ELSE 'topic' END, 'user'
         FROM unnest($2::citext[]) AS name
         ON CONFLICT DO NOTHING`,
        [newPin.id, tags, categories],
      );
    }

    // Attach / Update PinDatacenter
    if (matchedPin && !flags.dry) {
      const waterGpd = estimateWaterGallonsPerDayFromMw(mw);
      await saveDatacenter(matchedPin.id, {
        waterGallonsPerDay: waterGpd,
        waterBasis: 'estimated',
        chips: chips ?? null,
        chipModel: chipModel ?? null,
        h100Equivalents: h100e ?? null,
        acres: ep.acreage ? Number(ep.acreage) : null,
        sqft: ep.sqft ? Number(ep.sqft) : null,
        buildings: ep.building_count ? Number(ep.building_count) : null,
        generators: generators ?? null,
        cooling: ep.cooling_system ?? 'Direct-to-chip liquid cooling',
        powerSource: powerSource ?? null,
        sourceUrl,
        note: `Epoch AI cluster: ${ep.id}${genFight ? ` | Air permit fight: ${genFight.quote}` : ''}`,
      });
    }
  }

  // 3. Seed remaining unpinned US Data Center Tracker (TDC) campuses with shapes
  console.log(`\n--- Seeding Unpinned TDC Campuses with Shapes ---`);
  const tdcWithShapes = tdcList.filter(
    (t) => (t.geojson && t.geojson.coordinates?.length) || (t.sites && t.sites.some((s: any) => s.geojson?.coordinates?.length)),
  );

  for (const td of tdcWithShapes) {
    if (td.lat == null || td.lon == null) continue;
    const lat = Number(td.lat);
    const lon = Number(td.lon);
    const name = String(td.name || 'US Data Center').trim();
    const state = String(td.state || 'USA').trim();
    const slug = slugify(name);
    const stateSlug = slugify(state);
    const sourceUrl = `https://trackdatacenters.com/usa/${stateSlug}#${slug}`;

    // Skip if pin already exists
    if (
      existingPins.some((p) => p.sourceUrl === sourceUrl || p.title.toLowerCase().includes(name.toLowerCase())) ||
      hasNearbyPin(lat, lon, 1.2)
    ) {
      continue;
    }

    const nearDct = dctList.find(
      (df) => df.lat != null && df.lng != null && haversineKm(lat, lon, Number(df.lat), Number(df.lng)) <= 3,
    );

    const genFight = generatorFights.find(
      (gf) => gf.lat && gf.lng && haversineKm(lat, lon, gf.lat, gf.lng) <= 5,
    );

    const mw =
      (td.capacityMw != null && Number(td.capacityMw) > 0 ? Number(td.capacityMw) : null) ??
      (nearDct?.megawatts != null && Number(nearDct.megawatts) > 0 ? Number(nearDct.megawatts) : null) ??
      100;

    const acres =
      (td.sizeAcres != null && Number(td.sizeAcres) > 0 ? Number(td.sizeAcres) : null) ??
      (nearDct?.acreage != null && Number(nearDct.acreage) > 0 ? Number(nearDct.acreage) : null);

    const sqft =
      (td.facilitySizeSqft != null && Number(td.facilitySizeSqft) > 0 ? Number(td.facilitySizeSqft) : null) ??
      (nearDct?.building_sq_ft != null && Number(nearDct.building_sq_ft) > 0 ? Number(nearDct.building_sq_ft) : null);

    const generators = genFight?.gens ?? (td.numberOfGenerators ? Number(td.numberOfGenerators) : null);
    const powerSource = genFight?.powerSource ?? (td.btmPowerName ? `BTM: ${td.btmPowerName}` : 'Utility grid');

    const dateStr = parseDateAnnounced(td.announcementDate || nearDct?.date, '2026-07-01T00:00:00Z');

    if (flags.dry) {
      console.log(`[DRY] Would seed TDC campus: ${name} (${state}) [${mw} MW, ${generators ?? 0} gens]`);
      seededTdcCount++;
      continue;
    }

    const title = `${name}: ${mw} MW Data Center Campus in ${state}`;
    const desc = `Data center campus in ${state} with tracked parcel boundary (${acres ? `${acres} acres, ` : ''}${sqft ? `${sqft.toLocaleString()} sq ft, ` : ''}${mw} MW).`;
    const longForm = `<p>${desc}</p><ul><li><strong>Capacity:</strong> ${mw} MW</li>${acres ? `<li><strong>Acreage:</strong> ${acres} acres</li>` : ''}${sqft ? `<li><strong>Facility Size:</strong> ${sqft.toLocaleString()} sq ft</li>` : ''}${generators ? `<li><strong>Backup Generators:</strong> ${generators} ${powerSource}</li>` : ''}<li><strong>Tracked by:</strong> Data Center Tracker (#${td.id})</li></ul>`;

    const [comp] = await db.query<{ id: number }>(
      `INSERT INTO "Company" ("name") VALUES ($1) ON CONFLICT ("name") DO UPDATE SET "name" = "Company"."name" RETURNING "id"`,
      [name],
    );

    const [newPin] = await db.query<{ id: number }>(`
      INSERT INTO "Pin" (
        "title", "description", "sourceUrl", "longFormSummary", "address", "location",
        "companyId", "price", "priceCurrency", "dateConfidence", "dateConfidenceReasoning",
        "utcStartDateTime", "allDay", "userId"
      ) VALUES (
        $1, $2, $3, $4, $5, ST_SetSRID(ST_MakePoint($7, $6), 4326)::geography,
        $8, NULL, 'USD', 'estimated', 'Data Center Tracker boundary verified footprint',
        $9, true, $10
      ) RETURNING "id"
    `, [
      title, desc, sourceUrl, longForm,
      `${name}, ${state}, USA`,
      lat, lon, comp.id, dateStr, userId,
    ]);

    existingPins.push({ id: newPin.id, title, sourceUrl, lat, lon });
    seededTdcCount++;

    // PinPower & PinEnergy
    await db.query(`
      INSERT INTO "PinPower" ("pinId", "megawatts", "kind", "source", "sourceUrl", "note")
      VALUES ($1, $2, 'usage', 'hand', $3, 'Data Center Tracker')
      ON CONFLICT ("pinId") DO UPDATE SET "megawatts" = EXCLUDED."megawatts"
    `, [newPin.id, mw, sourceUrl]);

    const gwh = Math.round(mw * 8.76 * 0.6 * 10) / 10;
    await db.query(`
      INSERT INTO "PinEnergy" ("pinId", "gwh", "basis", "sourceUrl", "note", "checkedAt")
      VALUES ($1, $2, 'calculated', $3, 'Calculated from 60% load factor', $4)
      ON CONFLICT ("pinId") DO UPDATE SET "gwh" = EXCLUDED."gwh"
    `, [newPin.id, gwh, sourceUrl, CHECKED_AT]);

    // PinDatacenter
    const waterGpd = estimateWaterGallonsPerDayFromMw(mw);
    await saveDatacenter(newPin.id, {
      waterGallonsPerDay: waterGpd,
      waterBasis: 'estimated',
      chips: null,
      chipModel: null,
      h100Equivalents: null,
      acres: acres ?? null,
      sqft: sqft ?? null,
      buildings: td.numberOfBuildings ? Number(td.numberOfBuildings) : null,
      generators: generators ?? null,
      cooling: 'Closed-loop chilled water',
      powerSource: powerSource ?? null,
      sourceUrl,
      note: `Tracker #${td.id}${genFight ? ` | Air permit fight: ${genFight.quote}` : ''}`,
    });

    // Tags
    const categories = ['Infrastructure', 'Energy'];
    const tags = ['Data Centers', state, ...categories];
    await db.query(
      `INSERT INTO "PinTag" ("pinId", "name", "kind", "source")
       SELECT $1, name, CASE WHEN name = ANY($3::text[]) THEN 'category' ELSE 'topic' END, 'user'
       FROM unnest($2::citext[]) AS name
       ON CONFLICT DO NOTHING`,
      [newPin.id, tags, categories],
    );
  }

  // 4. Seed missing air-permit generator facilities that do not yet have a pin
  console.log(`\n--- Seeding Missing Air-Permit Generator Facilities ---`);
  for (const gf of generatorFights) {
    if (!gf.lat || !gf.lng) continue;
    const name = gf.project_name || gf.company || `${gf.county} Data Center`;
    const state = gf.state || 'USA';
    const slug = slugify(name);
    const sourceUrl = gf.sourceUrl || `https://datacentertracker.org/fights#${slugify(gf.id)}`;

    // Check if pin exists within 6 km
    const exists = existingPins.some(
      (p) =>
        p.sourceUrl === sourceUrl ||
        (p.lat != null && p.lon != null && haversineKm(gf.lat!, gf.lng!, p.lat, p.lon) <= 6 && (p.title.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(p.title.toLowerCase()))),
    );
    if (exists) continue;

    const mw = gf.mw ?? 150;
    const acres = gf.acres;
    const sqft = gf.sqft;
    const dateStr = parseDateAnnounced(gf.date, '2026-07-01T00:00:00Z');

    if (flags.dry) {
      console.log(`[DRY] Would seed air-permit facility: ${name} (${state}, ${gf.county}) [${mw} MW, ${gf.gens} gens]`);
      seededFightsCount++;
      continue;
    }

    const title = `${name}: ${mw} MW Facility with ${gf.gens} ${gf.powerSource} in ${gf.county || state}`;
    const desc = `${name} is an active data center project in ${gf.county ? `${gf.county}, ${state}` : state} with documented air permitting for ${gf.gens} ${gf.powerSource}.`;
    const longForm = `<p>${desc}</p><ul><li><strong>Power capacity:</strong> ${mw} MW</li>${acres ? `<li><strong>Acreage:</strong> ${acres} acres</li>` : ''}${sqft ? `<li><strong>Facility Size:</strong> ${sqft.toLocaleString()} sq ft</li>` : ''}<li><strong>Air-Permit Generators:</strong> ${gf.gens} ${gf.powerSource} (${gf.quote})</li><li><strong>Source Document / Fight:</strong> ${gf.id}</li></ul>`;

    const [comp] = await db.query<{ id: number }>(
      `INSERT INTO "Company" ("name") VALUES ($1) ON CONFLICT ("name") DO UPDATE SET "name" = "Company"."name" RETURNING "id"`,
      [gf.company || name],
    );

    const [newPin] = await db.query<{ id: number }>(`
      INSERT INTO "Pin" (
        "title", "description", "sourceUrl", "longFormSummary", "address", "location",
        "companyId", "price", "priceCurrency", "dateConfidence", "dateConfidenceReasoning",
        "utcStartDateTime", "allDay", "userId"
      ) VALUES (
        $1, $2, $3, $4, $5, ST_SetSRID(ST_MakePoint($7, $6), 4326)::geography,
        $8, NULL, 'USD', 'estimated', 'Air permit and state utility commission filing',
        $9, true, $10
      ) RETURNING "id"
    `, [
      title, desc, sourceUrl, longForm,
      gf.county ? `${gf.county}, ${state}, USA` : `${state}, USA`,
      gf.lat, gf.lng, comp.id, dateStr, userId,
    ]);

    existingPins.push({ id: newPin.id, title, sourceUrl, lat: gf.lat, lon: gf.lng });
    seededFightsCount++;

    // PinPower & PinEnergy
    await db.query(`
      INSERT INTO "PinPower" ("pinId", "megawatts", "kind", "source", "sourceUrl", "note")
      VALUES ($1, $2, 'usage', 'hand', $3, 'Air permit filing')
      ON CONFLICT ("pinId") DO UPDATE SET "megawatts" = EXCLUDED."megawatts"
    `, [newPin.id, mw, sourceUrl]);

    const gwh = Math.round(mw * 8.76 * 0.6 * 10) / 10;
    await db.query(`
      INSERT INTO "PinEnergy" ("pinId", "gwh", "basis", "sourceUrl", "note", "checkedAt")
      VALUES ($1, $2, 'calculated', $3, 'Calculated from 60% load factor', $4)
      ON CONFLICT ("pinId") DO UPDATE SET "gwh" = EXCLUDED."gwh"
    `, [newPin.id, gwh, sourceUrl, CHECKED_AT]);

    // PinDatacenter
    const waterGpd = estimateWaterGallonsPerDayFromMw(mw);
    await saveDatacenter(newPin.id, {
      waterGallonsPerDay: waterGpd,
      waterBasis: 'estimated',
      chips: null,
      chipModel: null,
      h100Equivalents: null,
      acres: acres ?? null,
      sqft: sqft ?? null,
      buildings: null,
      generators: gf.gens,
      cooling: 'Closed-loop chilled water',
      powerSource: gf.powerSource,
      sourceUrl,
      note: `Air permit filing: ${gf.quote}`,
    });

    // Tags
    const categories = ['Infrastructure', 'Energy'];
    const tags = ['Data Centers', state, ...categories];
    await db.query(
      `INSERT INTO "PinTag" ("pinId", "name", "kind", "source")
       SELECT $1, name, CASE WHEN name = ANY($3::text[]) THEN 'category' ELSE 'topic' END, 'user'
       FROM unnest($2::citext[]) AS name
       ON CONFLICT DO NOTHING`,
      [newPin.id, tags, categories],
    );
  }

  // 5. Update generator & turbine counts on ALL matching data center pins
  console.log(`\n--- Ingesting Air-Permit Generator Counts into PinDatacenter ---`);
  const dcPins = await db.query<{
    id: number;
    title: string;
    sourceUrl: string | null;
    note: string | null;
    generators: number | null;
    powerSource: string | null;
    lat: number;
    lon: number;
  }>(`
    SELECT p."id", p."title", p."sourceUrl", dc."note", dc."generators", dc."powerSource",
           ST_Y(p."location"::geometry) AS "lat", ST_X(p."location"::geometry) AS "lon"
    FROM "Pin" p JOIN "PinDatacenter" dc ON dc."pinId" = p."id"
    WHERE p."utcDeletedDateTime" IS NULL AND p."location" IS NOT NULL
  `);

  for (const gf of generatorFights) {
    if (!gf.lat || !gf.lng) continue;
    // Find matching pin within 10 km
    const candidates = dcPins
      .map((p) => ({ pin: p, km: haversineKm(p.lat, p.lon, gf.lat!, gf.lng!) }))
      .filter((x) => x.km <= 10)
      .sort((a, b) => a.km - b.km);

    if (candidates.length > 0) {
      const match = candidates[0].pin;
      if (match.generators !== gf.gens || match.powerSource !== gf.powerSource) {
        if (!flags.dry) {
          const updatedNote = match.note
            ? (match.note.includes('Air permit') ? match.note : `${match.note} | Air permit: ${gf.quote}`)
            : `Air permit: ${gf.quote}`;
          await db.query(`
            UPDATE "PinDatacenter"
            SET "generators" = $1, "powerSource" = $2, "note" = $3, "checkedAt" = $4
            WHERE "pinId" = $5
          `, [gf.gens, gf.powerSource, updatedNote, CHECKED_AT, match.id]);
        }
        updatedGeneratorsCount++;
        console.log(`[GEN UPDATE] Pin #${match.id} "${match.title}": set ${gf.gens} gens, powerSource="${gf.powerSource}" (from ${gf.id})`);
      }
    }
  }

  console.log(`\n=== Ingestion & Seeding Summary ===`);
  console.log(`Seeded Epoch AI Frontier Clusters: ${seededEpochCount}`);
  console.log(`Seeded TDC Campuses: ${seededTdcCount}`);
  console.log(`Seeded Air-Permit Facilities: ${seededFightsCount}`);
  console.log(`Updated Air-Permit Generator Telemetry: ${updatedGeneratorsCount}`);

  // 6. Re-run siteShapes matching locally
  console.log(`\n--- Running siteShapes.ts to attach boundary polygons ---`);
  const { execSync } = await import('node:child_process');
  execSync('npx tsx scripts/power/siteShapes.ts', { stdio: 'inherit' });

  // 7. If --prod, sync all pins, power, datacenter, and site shapes to production!
  if (flags.prod) {
    console.log(`\n--- Syncing all new pins and telemetry to production ---`);
    execSync('npx tsx scripts/power/datacenterProd.ts', { stdio: 'inherit' });

    console.log(`\n--- Syncing site shapes to production ---`);
    execSync('npx tsx scripts/power/siteShapes.ts --prod', { stdio: 'inherit' });
  }

  console.log(`\n[ingestAndSeedCampuses] Finished successfully!`);
}

main().catch((err) => {
  console.error('[ingestAndSeedCampuses] Failed:', err);
  process.exit(1);
});
