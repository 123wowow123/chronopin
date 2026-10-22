// Seeds all remaining unpinned Pennsylvania data centers (from trackdatacenters.com),
// all remaining unpinned Epoch AI Frontier data centers (from epoch.ai/data/data-centers),
// and remaining State AI Data Center Legislation pins (from datacentertracker.org/legislation),
// populating Pin, PinPower, PinEnergy, PinDatacenter, PinTag, and PinReference.
//
// Usage:
//   npx tsx scripts/power/seedRemainingDatacenters.ts

import '../env';
import fs from 'node:fs';
import * as db from '@/server/db';
import { estimateWaterGallonsPerDayFromMw, normalizeCooling, normalizePowerSource, type WaterBasis } from '@/lib/datacenter';
import { saveDatacenter } from '@/server/model/pinDatacenter';

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

async function main() {
  const tdcList: any[] = JSON.parse(fs.readFileSync('.scrape/datacenter-stats-2026-10-21/trackdatacenters.json', 'utf8'));
  const dctList: any[] = JSON.parse(fs.readFileSync('.scrape/datacenter-stats-2026-10-21/dct_fights.json', 'utf8'));
  const epochJson: any = JSON.parse(fs.readFileSync('.scrape/datacenter-stats-2026-10-21/epoch_map_unwrapped.json', 'utf8'));

  const epochWaterByDc = new Map<string, number>();
  const timelineLines = fs.readFileSync('.scrape/datacenter-stats-2026-10-21/epoch_data_center_timelines.csv', 'utf8').split('\n');
  for (const line of timelineLines.slice(1)) {
    const parts = line.split(',');
    if (parts.length >= 13) {
      const dcName = parts[0]?.trim();
      const mgd = Number(parts[parts.length - 2]);
      if (dcName && Number.isFinite(mgd) && mgd > 0) {
        epochWaterByDc.set(dcName.toLowerCase(), Math.max(epochWaterByDc.get(dcName.toLowerCase()) ?? 0, Math.round(mgd * 1_000_000)));
      }
    }
  }

  const epochChipsByDc = new Map<string, { chips: number; models: Set<string> }>();
  const chipLines = fs.readFileSync('.scrape/datacenter-stats-2026-10-21/epoch_data_centers_chip_quantities.csv', 'utf8').split('\n');
  for (const line of chipLines.slice(1)) {
    const match = line.match(/^([^,]+),(\d{4}-\d{2}-\d{2}),([^,]+),(\d+(?:\.\d+)?),.*?,([^,]+),(\d{4}-\d{2}-\d{2})\s*$/);
    if (match) {
      const chipType = match[3].trim();
      const units = Math.round(Number(match[4]));
      const dcName = match[5].trim().toLowerCase();
      if (units > 0 && dcName) {
        const cur = epochChipsByDc.get(dcName) ?? { chips: 0, models: new Set<string>() };
        cur.chips += units;
        cur.models.add(chipType);
        epochChipsByDc.set(dcName, cur);
      }
    }
  }

  const [techDesk] = await db.query<{ id: number }>(`SELECT "id" FROM "User" WHERE "userName" = '@TechDesk' LIMIT 1`);
  const userId = techDesk?.id ?? 276;

  // Load existing pins with coordinates & sourceUrls to avoid duplicates
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

  let paSeeded = 0;
  let epochSeeded = 0;
  let legSeeded = 0;

  // 1. Seed all remaining Pennsylvania Data Centers from trackdatacenters.json
  const paSites = tdcList.filter((x) => x.state === 'Pennsylvania' && x.lat != null && x.lon != null);
  for (const td of paSites) {
    const lat = Number(td.lat);
    const lon = Number(td.lon);
    const name = String(td.name || 'Pennsylvania Data Center').trim();
    const slug = slugify(name);
    const sourceUrl =
      (Array.isArray(td.sources) && td.sources[0]?.id && String(td.sources[0].id).startsWith('http')
        ? String(td.sources[0].id)
        : null) ?? `https://trackdatacenters.com/usa/pennsylvania#${slug}`;

    if (
      existingPins.some((p) => p.sourceUrl === sourceUrl || p.title.toLowerCase().includes(name.toLowerCase())) ||
      hasNearbyPin(lat, lon, 1.8)
    ) {
      continue;
    }

    // Check dct_fights within 3 km for extra water/MW/acres/cost
    const nearDct = dctList.find(
      (df) => df.lat != null && df.lng != null && haversineKm(lat, lon, Number(df.lat), Number(df.lng)) <= 3,
    );

    const towns = Array.isArray(td.municipality?.towns) ? td.municipality.towns.join(', ') : '';
    const counties = Array.isArray(td.municipality?.counties) ? td.municipality.counties.join(', ') : '';
    const locLabel = [towns, counties, 'Pennsylvania'].filter(Boolean).join(', ');

    const mw =
      (td.capacityMw != null && Number(td.capacityMw) > 0 ? Number(td.capacityMw) : null) ??
      (nearDct?.megawatts != null && Number(nearDct.megawatts) > 0 ? Number(nearDct.megawatts) : null);

    const acres =
      (td.sizeAcres != null && Number(td.sizeAcres) > 0 ? Number(td.sizeAcres) : null) ??
      (nearDct?.acreage != null && Number(nearDct.acreage) > 0 ? Number(nearDct.acreage) : null);

    const sqft =
      (td.facilitySizeSqft != null && Number(td.facilitySizeSqft) > 0 ? Number(td.facilitySizeSqft) : null) ??
      (nearDct?.building_sq_ft != null && Number(nearDct.building_sq_ft) > 0 ? Number(nearDct.building_sq_ft) : null);

    const buildings = td.numberOfBuildings != null && Number(td.numberOfBuildings) > 0 ? Number(td.numberOfBuildings) : null;
    const generators = td.numberOfGenerators != null && Number(td.numberOfGenerators) > 0 ? Number(td.numberOfGenerators) : null;

    const price =
      (td.projectCost != null && Number(td.projectCost) > 0 ? Number(td.projectCost) : null) ??
      (nearDct?.investment_million_usd != null && Number(nearDct.investment_million_usd) > 0
        ? Number(nearDct.investment_million_usd) * 1_000_000
        : null);

    let waterGallonsPerDay: number | null =
      nearDct?.water_usage_gallons_per_day != null && Number(nearDct.water_usage_gallons_per_day) > 0
        ? Number(nearDct.water_usage_gallons_per_day)
        : null;
    let waterBasis: WaterBasis | null = waterGallonsPerDay ? 'published' : null;
    if (!waterGallonsPerDay && mw != null && mw > 0) {
      waterGallonsPerDay = estimateWaterGallonsPerDayFromMw(mw);
      waterBasis = 'estimated';
    }

    const cooling = normalizeCooling([td.coolingType, td.coolingSource].filter(Boolean).join(' · ') || null);
    const powerSource = normalizePowerSource(
      (Array.isArray(td.powerSource) && td.powerSource.length ? td.powerSource.join(', ') : typeof td.powerSource === 'string' && td.powerSource ? td.powerSource : null) ??
      (Array.isArray(td.btmPowerName) && td.btmPowerName.length ? td.btmPowerName.join(', ') : null) ??
      'PJM Interconnection / Pennsylvania Grid',
    );

    const stakeholders = td.stakeholders ? Object.values(td.stakeholders).flat().filter(Boolean).map(String) : [];
    const companyName = stakeholders[0] || nearDct?.company || nearDct?.hyperscaler || `${name} LLC`;

    const metricTags: string[] = [];
    if (mw) metricTags.push(`${mw.toLocaleString('en-US')} MW`);
    if (acres) metricTags.push(`${acres.toLocaleString('en-US')}-Acre`);
    else if (sqft) metricTags.push(`${Math.round(sqft / 1000).toLocaleString('en-US')}K Sq Ft`);
    const headlineSpec = metricTags.length ? `${metricTags.join(' ')} ` : '';
    const title = `${name}: ${headlineSpec}Data Center Campus in ${counties || towns || 'Pennsylvania'}`;

    const infoText = String(td.info || nearDct?.summary || `${name} is a ${td.phase || 'proposed'} data center development in ${locLabel}.`).trim();
    const description = `<p>${escapeHtml(infoText)}</p>`;

    const bullets: string[] = [];
    if (mw) bullets.push(`<li><strong>Electrical Load:</strong> ${mw.toLocaleString('en-US')} MW planned utility capacity on the Pennsylvania / PJM grid.<cite data-ref="${escapeHtml(sourceUrl)}"></cite></li>`);
    if (acres || sqft || buildings) {
      const parts = [
        acres ? `${acres.toLocaleString('en-US')} acres` : null,
        sqft ? `${sqft.toLocaleString('en-US')} sq ft` : null,
        buildings ? `${buildings} planned buildings` : null,
      ].filter(Boolean);
      bullets.push(`<li><strong>Site &amp; Facility Footprint:</strong> ${escapeHtml(parts.join(' · '))} in ${escapeHtml(locLabel)}.</li>`);
    }
    if (waterGallonsPerDay) {
      bullets.push(`<li><strong>Water Demand:</strong> ${(waterGallonsPerDay / 1_000_000).toFixed(2)} MGD (${waterBasis}).</li>`);
    }
    if (generators) {
      bullets.push(`<li><strong>Backup Generation:</strong> ${generators} emergency backup generators tracked in Pennsylvania filings.</li>`);
    }
    if (!bullets.length) {
      bullets.push(`<li><strong>Location &amp; Status:</strong> ${escapeHtml(locLabel)} (${escapeHtml(String(td.phase || 'proposed'))}).<cite data-ref="${escapeHtml(sourceUrl)}"></cite></li>`);
    }
    const longFormSummary = `<ul>${bullets.join('')}</ul>`;

    const utcStartDateTime = parseDateAnnounced(td.dateAnnounced || nearDct?.date, '2026-08-01T00:00:00Z');
    const [comp] = await db.query<{ id: number }>(
      `INSERT INTO "Company" ("name") VALUES ($1) ON CONFLICT ("name") DO UPDATE SET "name" = "Company"."name" RETURNING "id"`,
      [companyName],
    );
    const [inserted] = await db.query<{ id: number }>(
      `INSERT INTO "Pin" (
        "title", "description", "sourceUrl", "longFormSummary", "address", "location",
        "companyId", "price", "priceCurrency", "dateConfidence", "dateConfidenceReasoning",
        "utcStartDateTime", "allDay", "userId"
      ) VALUES (
        $1, $2, $3, $4, $5, ST_SetSRID(ST_MakePoint($7, $6), 4326)::geography,
        $8, $9, $10, 'estimated', $11, $12, true, $13
      ) RETURNING "id"`,
      [
        title,
        description,
        sourceUrl,
        longFormSummary,
        locLabel,
        lat,
        lon,
        comp.id,
        price,
        price != null ? 'USD' : null,
        `Dated to announced / active development milestone (${td.dateAnnounced || '2025–2026'}) tracked by PA Data Center Tracker.`,
        utcStartDateTime,
        userId,
      ],
    );
    const pinId = inserted.id;
    existingPins.push({ id: pinId, title, sourceUrl, lat, lon });

    const categories = ['Infrastructure', 'AI', 'Energy'];
    const tags = ['Data Centers', 'AI Data Centers', 'Pennsylvania', 'PJM Interconnection', ...categories];
    await db.query(
      `INSERT INTO "PinTag" ("pinId", "name", "kind", "source")
       SELECT $1, name, CASE WHEN name = ANY($3::text[]) THEN 'category' ELSE 'topic' END, 'user'
       FROM unnest($2::citext[]) AS name
       ON CONFLICT DO NOTHING`,
      [pinId, tags, categories],
    );
    await db.query(
      `INSERT INTO "PinReference" ("pinId", "url", "title", "confidence", "reasoning")
       VALUES ($1, $2, $3, 86, $4)`,
      [pinId, sourceUrl, title, 'Documented in Pennsylvania Data Center Tracker (trackdatacenters.com/usa/pennsylvania)'],
    );

    if (mw != null && mw > 0) {
      await db.query(
        `INSERT INTO "PinPower" ("pinId", "megawatts", "kind", "source", "sourceUrl", "note")
         VALUES ($1, $2, 'usage', 'hand', $3, $4)
         ON CONFLICT ("pinId") DO UPDATE SET "megawatts" = EXCLUDED."megawatts"`,
        [pinId, mw, sourceUrl, powerSource],
      );
      const gwh = Math.round(mw * 8.76 * 0.6 * 10) / 10;
      await db.query(
        `INSERT INTO "PinEnergy" ("pinId", "gwh", "basis", "sourceUrl", "note", "checkedAt")
         VALUES ($1, $2, 'calculated', $3, 'Calculated at 60% load factor', $4)
         ON CONFLICT ("pinId") DO NOTHING`,
        [pinId, gwh, sourceUrl, CHECKED_AT],
      );
    }

    await saveDatacenter(pinId, {
      waterGallonsPerDay,
      waterBasis,
      acres,
      sqft,
      buildings,
      generators,
      cooling,
      powerSource,
      sourceUrl: 'https://trackdatacenters.com/usa/pennsylvania',
      note: `Pennsylvania Data Center Tracker #${td.id} (${td.phase || 'proposed'})`,
    });
    paSeeded++;
  }

  // 2. Seed all remaining Frontier AI Data Centers from Epoch AI (epoch_map_unwrapped.json)
  const epochCenters: any[] = Array.isArray(epochJson.dataCenters) ? epochJson.dataCenters : [];
  for (const edc of epochCenters) {
    if (!Array.isArray(edc.lngLat) || edc.lngLat.length < 2) continue;
    const lon = Number(edc.lngLat[0]);
    const lat = Number(edc.lngLat[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;

    const handle = String(edc.id || '').trim();
    const rawTitle = String(edc.title || handle).trim();
    const sourceUrl = `https://epoch.ai/data/data-centers#${slugify(handle)}`;

    if (
      existingPins.some((p) => p.sourceUrl === sourceUrl || p.title.toLowerCase().includes(rawTitle.toLowerCase())) ||
      hasNearbyPin(lat, lon, 3.0)
    ) {
      continue;
    }

    const timeline: any[] = Array.isArray(edc.timeline) ? edc.timeline : [];
    const latestTl = timeline.length ? timeline[timeline.length - 1] : null;
    const firstTl = timeline.length ? timeline[0] : null;

    const mw = latestTl?.power != null && Number(latestTl.power) > 0 ? Math.round(Number(latestTl.power) * 10) / 10 : null;
    const h100Equivalents = latestTl?.h100e != null && Number(latestTl.h100e) > 0 ? Math.round(Number(latestTl.h100e)) : null;
    const price = latestTl?.cost != null && Number(latestTl.cost) > 0 ? Math.round(Number(latestTl.cost)) : null;

    const dcKey = handle.toLowerCase();
    const chipInfo = epochChipsByDc.get(dcKey) ?? epochChipsByDc.get(rawTitle.toLowerCase());
    const chips = chipInfo?.chips ?? h100Equivalents ?? null;
    const chipModel = chipInfo ? [...chipInfo.models].slice(0, 3).join(' / ') : h100Equivalents ? 'H100-equivalents (Epoch AI)' : null;

    let waterGallonsPerDay: number | null = epochWaterByDc.get(dcKey) ?? epochWaterByDc.get(rawTitle.toLowerCase()) ?? null;
    let waterBasis: WaterBasis | null = waterGallonsPerDay ? 'published' : null;
    if (!waterGallonsPerDay && mw != null && mw > 0) {
      waterGallonsPerDay = estimateWaterGallonsPerDayFromMw(mw);
      waterBasis = 'estimated';
    }

    let buildings: number | null = null;
    let generators: number | null = null;
    if (Array.isArray(edc.shapes?.features)) {
      const bCount = edc.shapes.features.filter((f: any) => /building/i.test(f.properties?.type || '')).length;
      const gCount = edc.shapes.features.filter((f: any) => /generator/i.test(f.properties?.type || '')).length;
      if (bCount > 0) buildings = bCount;
      if (gCount > 0) generators = gCount;
    }

    const city = edc.facts?.city || '';
    const state = edc.facts?.state || '';
    const country = edc.facts?.country || 'United States';
    const address = [city, state, country].filter(Boolean).join(', ');
    const owner = edc.facts?.owner?.value || 'Hyperscale AI Operator';
    const userVal = Array.isArray(edc.facts?.users) && edc.facts.users[0]?.value ? edc.facts.users[0].value : null;
    const companyName = userVal && userVal !== owner ? `${owner} / ${userVal}` : owner;

    const specParts: string[] = [];
    if (mw) specParts.push(`${mw.toLocaleString('en-US')} MW`);
    if (h100Equivalents) specParts.push(`${Math.round(h100Equivalents / 1000).toLocaleString('en-US')}K H100e`);
    const specPrefix = specParts.length ? `${specParts.join(' / ')} ` : '';
    const title = `${rawTitle}: ${specPrefix}Frontier AI Data Center Cluster in ${city || state || country}`;

    const addInfo = String(edc.facts?.additionalInformation || '').trim();
    const descText = `${rawTitle} in ${address} is a frontier AI data center campus operated by ${companyName}${mw ? ` reaching ${mw.toLocaleString('en-US')} MW of power capacity` : ''}${h100Equivalents ? ` and ${h100Equivalents.toLocaleString('en-US')} H100-equivalent AI accelerators` : ''}.${addInfo ? ` ${addInfo}` : ''}`;
    const description = `<p>${escapeHtml(descText)}</p>`;

    const bullets: string[] = [];
    if (mw || h100Equivalents) {
      bullets.push(
        `<li><strong>Compute &amp; Power Scale:</strong> ${mw ? `${mw.toLocaleString('en-US')} MW electrical capacity` : 'Frontier AI cluster'}${h100Equivalents ? ` delivering ${h100Equivalents.toLocaleString('en-US')} H100-equivalents (${escapeHtml(chipModel || 'AI GPUs')})` : ''}.<cite data-ref="${escapeHtml(sourceUrl)}"></cite></li>`,
      );
    }
    if (buildings || generators) {
      bullets.push(
        `<li><strong>Satellite-Verified Facility Footprint:</strong> ${[buildings ? `${buildings} data center buildings` : null, generators ? `${generators} backup generator units` : null].filter(Boolean).join(' and ')} mapped in Epoch AI satellite annotations.</li>`,
      );
    }
    if (waterGallonsPerDay) {
      bullets.push(`<li><strong>Water Demand:</strong> ${(waterGallonsPerDay / 1_000_000).toFixed(2)} MGD (${waterBasis}).</li>`);
    }
    const longFormSummary = `<ul>${bullets.join('')}</ul>`;

    const utcStartDateTime = parseDateAnnounced(latestTl?.date || firstTl?.date, '2026-09-01T00:00:00Z');
    const [comp] = await db.query<{ id: number }>(
      `INSERT INTO "Company" ("name") VALUES ($1) ON CONFLICT ("name") DO UPDATE SET "name" = "Company"."name" RETURNING "id"`,
      [companyName],
    );
    const [inserted] = await db.query<{ id: number }>(
      `INSERT INTO "Pin" (
        "title", "description", "sourceUrl", "longFormSummary", "address", "location",
        "companyId", "price", "priceCurrency", "dateConfidence", "dateConfidenceReasoning",
        "utcStartDateTime", "allDay", "userId"
      ) VALUES (
        $1, $2, $3, $4, $5, ST_SetSRID(ST_MakePoint($7, $6), 4326)::geography,
        $8, $9, $10, 'estimated', $11, $12, true, $13
      ) RETURNING "id"`,
      [
        title,
        description,
        sourceUrl,
        longFormSummary,
        address,
        lat,
        lon,
        comp.id,
        price,
        price != null ? 'USD' : null,
        `Dated to Epoch AI satellite imagery and capacity timeline milestone (${latestTl?.date || '2026'}).`,
        utcStartDateTime,
        userId,
      ],
    );
    const pinId = inserted.id;
    existingPins.push({ id: pinId, title, sourceUrl, lat, lon });

    const categories = ['AI', 'Infrastructure', 'Energy'];
    const tags = ['Data Centers', 'AI Data Centers', 'Frontier AI', 'Hyperscale', ...(state ? [state] : []), ...categories];
    await db.query(
      `INSERT INTO "PinTag" ("pinId", "name", "kind", "source")
       SELECT $1, name, CASE WHEN name = ANY($3::text[]) THEN 'category' ELSE 'topic' END, 'user'
       FROM unnest($2::citext[]) AS name
       ON CONFLICT DO NOTHING`,
      [pinId, tags, categories],
    );
    await db.query(
      `INSERT INTO "PinReference" ("pinId", "url", "title", "confidence", "reasoning")
       VALUES ($1, $2, $3, 90, $4)`,
      [pinId, sourceUrl, title, 'Epoch AI Frontier Data Centers satellite & regulatory dataset'],
    );

    if (mw != null && mw > 0) {
      await db.query(
        `INSERT INTO "PinPower" ("pinId", "megawatts", "kind", "source", "sourceUrl", "note")
         VALUES ($1, $2, 'usage', 'hand', $3, $4)
         ON CONFLICT ("pinId") DO UPDATE SET "megawatts" = EXCLUDED."megawatts"`,
        [pinId, mw, sourceUrl, `${state || country} Regional Transmission Grid`],
      );
      const gwh = Math.round(mw * 8.76 * 0.6 * 10) / 10;
      await db.query(
        `INSERT INTO "PinEnergy" ("pinId", "gwh", "basis", "sourceUrl", "note", "checkedAt")
         VALUES ($1, $2, 'calculated', $3, 'Calculated at 60% load factor', $4)
         ON CONFLICT ("pinId") DO NOTHING`,
        [pinId, gwh, sourceUrl, CHECKED_AT],
      );
    }

    await saveDatacenter(pinId, {
      waterGallonsPerDay,
      waterBasis,
      chips,
      chipModel,
      h100Equivalents,
      buildings,
      generators,
      cooling: 'High-density liquid & chiller cooling',
      powerSource: `${state || country} Regional Utility Grid`,
      sourceUrl,
      note: `Epoch AI Frontier Data Center (${handle})`,
    });
    epochSeeded++;
  }

  // 3. Seed State AI Data Center Legislation pins from dct_fights.json (PA + enacted/notable bills nationwide)
  const stateBills = dctList.filter(
    (x) =>
      (x.authority_level === 'state_legislature' || (Array.isArray(x.action_type) && x.action_type.includes('legislation'))) &&
      x.lat != null &&
      x.lng != null &&
      x.summary &&
      (x.state === 'PA' || x.status === 'passed' || x.status === 'enacted' || x.status === 'active' || x.status === 'pending' || x.bill_name),
  );

  for (const bill of stateBills.slice(0, 65)) {
    const billName = String(bill.bill_name || bill.project_name || bill.objective || bill.jurisdiction).trim();
    const sourceUrl =
      bill.bill_url ||
      (Array.isArray(bill.sources) && typeof bill.sources[0] === 'string' && bill.sources[0].startsWith('http')
        ? bill.sources[0]
        : `https://datacentertracker.org/legislation#${slugify(bill.id || billName)}`);

    const title = `${bill.state} ${billName}: ${bill.objective || 'State AI Data Center Grid, Water & Ratepayer Accountability Legislation'}`;
    if (existingPins.some((p) => p.sourceUrl === sourceUrl || p.title.toLowerCase() === title.toLowerCase())) {
      continue;
    }

    const lat = Number(bill.lat);
    const lon = Number(bill.lng);
    const summaryText = String(bill.summary).trim();
    const description = `<p>${escapeHtml(summaryText)}</p>`;
    const sponsors = Array.isArray(bill.sponsors) && bill.sponsors.length ? bill.sponsors.join(', ') : 'State Legislature';
    const issues = Array.isArray(bill.issue_category) ? bill.issue_category.join(', ') : 'grid_energy, transparency';
    const longFormSummary = `<ul><li><strong>Legislative Objective:</strong> ${escapeHtml(String(bill.objective || billName))} (Status: ${escapeHtml(String(bill.status || 'introduced'))}).<cite data-ref="${escapeHtml(sourceUrl)}"></cite></li><li><strong>Sponsors &amp; Scope:</strong> ${escapeHtml(sponsors)} · Issues addressed: ${escapeHtml(issues)}.</li></ul>`;

    const utcStartDateTime = parseDateAnnounced(bill.date, '2026-02-01T00:00:00Z');
    const companyName = `${bill.state} State Legislature`;
    const [comp] = await db.query<{ id: number }>(
      `INSERT INTO "Company" ("name") VALUES ($1) ON CONFLICT ("name") DO UPDATE SET "name" = "Company"."name" RETURNING "id"`,
      [companyName],
    );
    const [inserted] = await db.query<{ id: number }>(
      `INSERT INTO "Pin" (
        "title", "description", "sourceUrl", "longFormSummary", "address", "location",
        "companyId", "price", "priceCurrency", "dateConfidence", "dateConfidenceReasoning",
        "utcStartDateTime", "allDay", "userId"
      ) VALUES (
        $1, $2, $3, $4, $5, ST_SetSRID(ST_MakePoint($7, $6), 4326)::geography,
        $8, null, null, 'confirmed', $9, $10, true, $11
      ) RETURNING "id"`,
      [
        title,
        description,
        sourceUrl,
        longFormSummary,
        `${bill.jurisdiction || bill.state}`,
        lat,
        lon,
        comp.id,
        `Legislative action date (${bill.date || '2025–2026'}) tracked by AI Data Center Legislation Tracker.`,
        utcStartDateTime,
        userId,
      ],
    );
    const pinId = inserted.id;
    existingPins.push({ id: pinId, title, sourceUrl, lat, lon });

    const categories = ['Politics', 'AI', 'Energy'];
    const tags = ['AI Data Center Legislation', 'Data Centers', 'Energy Policy', bill.state, ...categories];
    await db.query(
      `INSERT INTO "PinTag" ("pinId", "name", "kind", "source")
       SELECT $1, name, CASE WHEN name = ANY($3::text[]) THEN 'category' ELSE 'topic' END, 'user'
       FROM unnest($2::citext[]) AS name
       ON CONFLICT DO NOTHING`,
      [pinId, tags, categories],
    );
    await db.query(
      `INSERT INTO "PinReference" ("pinId", "url", "title", "confidence", "reasoning")
       VALUES ($1, $2, $3, 90, $4)`,
      [pinId, sourceUrl, title, 'AI Data Center Legislation Tracker (datacentertracker.org/legislation)'],
    );
    legSeeded++;
  }

  console.log('Seeded remaining pins:', {
    paSeeded,
    epochSeeded,
    legSeeded,
    totalNewPins: paSeeded + epochSeeded + legSeeded,
  });
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

