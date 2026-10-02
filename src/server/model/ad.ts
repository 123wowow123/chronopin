import type { NextRequest } from 'next/server';
import {
  type AdCandidate,
  type AdClickRow,
  type AdImpressionRow,
  type AdContext,
  type AdJson,
  type AdKind,
  type AdPerformance,
  type AdSlot,
  ageOn,
  MIN_AD_AGE,
  parseAmazonTags,
  pickAds,
  regionFromAcceptLanguage,
  servingStore,
  taggedAdUrl,
} from '@/lib/ads';
import * as db from '../db';
import { clientIp } from '../http';
import { countryOf } from '../ipLocation';
import { viewerPreference } from '../services/pages';
import { locateUnlocated } from './ipPlaces';
import PinView from './pinView';

// How long the ads (program rows, product listings, store ids) are reused
// before they are read again.
const INVENTORY_MS = 10 * 60 * 1000;
// How long a slot waits for the address's country; past it, the language.
const COUNTRY_WAIT_MS = 1500;
const REPEAT_SECONDS = 30;
const CLICK_LIMIT = 20000;
const IMPRESSION_DAYS = 400;
// How long a slot's own click-through stats are reused, and how far back
// they look: long enough to smooth over a quiet day, short enough that a
// program that stops converting loses its edge within a month.
const PERFORMANCE_MS = 30 * 60 * 1000;
const PERFORMANCE_WINDOW_DAYS = 30;

type Inventory = { ads: AdCandidate[]; tags: Record<string, string>; storesWithAds: Set<string>; at: number };
type Performance = { baselineCtr: number; byKey: Map<string, AdPerformance> };

const held = ((globalThis as any).__chronopinAds ??= { inventory: null }) as { inventory: Promise<Inventory> | null };
const heldPerformance = ((globalThis as any).__chronopinAdPerformance ??= new Map<AdSlot, { at: number; data: Promise<Performance> }>()) as Map<
  AdSlot,
  { at: number; data: Promise<Performance> }
>;

export type AdServeInput = { slot: AdSlot; n: number; pinId: number | null; avoid: Set<string>; userId: number | null; request: NextRequest };

// Program ads (0110) and product ads (the Amazon listings on pins).
export default class Ad {
  static inventory(): Promise<Inventory> {
    const current = held.inventory;
    if (current) {
      return current.then((inv) => {
        if (Date.now() - inv.at < INVENTORY_MS) return inv;
        if (held.inventory === current) held.inventory = null;
        return Ad.inventory();
      });
    }
    const loading = loadInventory();
    held.inventory = loading;
    loading.catch(() => {
      if (held.inventory === loading) held.inventory = null;
    });
    return loading;
  }

  // This slot's own click-through history over the trailing window, cached
  // per slot (src/lib/ads.ts performanceWeight reads it).
  static performance(slot: AdSlot): Promise<Performance> {
    const cached = heldPerformance.get(slot);
    if (cached && Date.now() - cached.at < PERFORMANCE_MS) return cached.data;
    const loading = loadPerformance(slot);
    heldPerformance.set(slot, { at: Date.now(), data: loading });
    loading.catch(() => {
      if (heldPerformance.get(slot)?.data === loading) heldPerformance.delete(slot);
    });
    return loading;
  }

  // Ads for one slot, with the store they were picked from. Nothing for a
  // signed-in viewer under MIN_AD_AGE.
  static async serve({ slot, n, pinId, avoid, userId, request }: AdServeInput): Promise<{ store: string; ads: AdJson[] }> {
    const [inventory, country, viewer, pin, performance] = await Promise.all([
      Ad.inventory(),
      viewerCountry(request),
      userId != null ? viewerFacts(userId) : null,
      pinId != null ? pinFacts(pinId) : null,
      Ad.performance(slot).catch(() => undefined),
    ]);
    const age = ageOn(viewer?.birthday);
    if (age != null && age < MIN_AD_AGE) return { store: 'US', ads: [] };
    const store = servingStore(country, inventory.tags, inventory.storesWithAds);
    const ctx: AdContext = { preference: viewer?.preference ?? null, age, pin, performance };
    const picked = pickAds(
      inventory.ads.filter((ad) => ad.store === store),
      ctx,
      n,
      avoid,
    );
    if (picked.length) await recordImpressions(picked, slot, store);
    return {
      store,
      ads: picked.map((ad) => ({
        key: ad.key,
        kind: ad.kind,
        program: ad.program,
        url: taggedAdUrl(ad.url, store, inventory.tags),
        title: ad.title,
        price: ad.price,
        currency: ad.price != null ? 'USD' : null,
        pinId: ad.pinId,
        category: ad.categories[0] ?? null,
        thumbName: ad.thumbName,
        originalUrl: ad.originalUrl,
      })),
    };
  }

  // One click, unless it repeats the same person's click on the same ad
  // within REPEAT_SECONDS or names an ad that does not exist. Answers whether
  // it was recorded.
  static async recordClick(click: { adKey: string; slot: AdSlot; pinId: number | null; userId: number | null; ip: string | null; page: string | null }): Promise<boolean> {
    const { ads, tags } = await Ad.inventory();
    const ad = ads.find((a) => a.key === click.adKey);
    if (!ad) return false;
    const rows = await db.query(
      `INSERT INTO "AdClick" ("adKey", "kind", "program", "adPinId", "slot", "pinId", "store", "url", "userId", "ip", "page")
       SELECT $1::varchar, $2::varchar, $3::varchar, $4::integer, $5::varchar, $6::integer, $7::varchar, $8::text, $9::integer, $10::inet, $12::text
       WHERE NOT EXISTS (
         SELECT 1 FROM "AdClick" AS "c"
         WHERE "c"."adKey" = $1::varchar
           AND ("c"."userId" = $9::integer OR ($9::integer IS NULL AND "c"."userId" IS NULL AND "c"."ip" = $10::inet))
           AND "c"."utcCreatedDateTime" > now() - make_interval(secs => $11::integer)
       )
       RETURNING "id"`,
      [ad.key, ad.kind, ad.program, ad.pinId, click.slot, click.pinId, ad.store, taggedAdUrl(ad.url, ad.store, tags), click.userId, click.ip, REPEAT_SECONDS, click.page],
    );
    return rows.length > 0;
  }

  static locateUnlocated(): Promise<number> {
    return locateUnlocated('AdClick');
  }

  // Every click, newest first, with the product's title and picture, the
  // page's pin and the clicker's user name.
  static async clicks(): Promise<AdClickRow[]> {
    const rows = await db.query<AdClickRow>(
      `SELECT "c"."id", to_char("c"."utcCreatedDateTime" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "at",
         "c"."adKey", "c"."kind", "c"."program", "c"."adPinId", "ap"."title" AS "adTitle", "c"."slot",
         "c"."pinId", "p"."title" AS "pinTitle", "c"."page", "c"."store", "c"."userId", "u"."userName", host("c"."ip") AS "ip",
         "c"."country", "c"."region", "c"."city", "c"."latitude", "c"."longitude"
       FROM "AdClick" AS "c"
         LEFT JOIN "Pin" AS "ap" ON "ap"."id" = "c"."adPinId"
         LEFT JOIN "Pin" AS "p" ON "p"."id" = "c"."pinId"
         LEFT JOIN "User" AS "u" ON "u"."id" = "c"."userId"
       ORDER BY "c"."utcCreatedDateTime" DESC, "c"."id" DESC
       LIMIT $1`,
      [CLICK_LIMIT],
    );
    const pictures = await PinView.pictures([...new Set(rows.flatMap((r) => (r.adPinId != null ? [r.adPinId] : [])))]);
    return rows.map((r) => ({ ...r, ...(r.adPinId != null ? pictures.get(r.adPinId) : undefined) }));
  }

  static impressions(): Promise<AdImpressionRow[]> {
    return db.query<AdImpressionRow>(
      `SELECT to_char("day", 'YYYY-MM-DD') AS "day", "adKey", "kind", "slot", "store", "count"
       FROM "AdImpression" WHERE "day" >= (now() AT TIME ZONE 'UTC')::date - $1::integer
       ORDER BY "day"`,
      [IMPRESSION_DAYS],
    );
  }

  // What each ad key is, for naming the ads in the admin tables.
  static async labels(keys: string[]): Promise<Record<string, { kind: AdKind; program: string | null; title: string | null; pinId: number | null }>> {
    const { ads } = await Ad.inventory();
    const byKey = new Map(ads.map((ad) => [ad.key, ad]));
    const out: Record<string, { kind: AdKind; program: string | null; title: string | null; pinId: number | null }> = {};
    const missing: number[] = [];
    for (const key of keys) {
      const ad = byKey.get(key);
      if (ad) out[key] = { kind: ad.kind, program: ad.program, title: ad.title, pinId: ad.pinId };
      else if (key.startsWith('m:')) missing.push(Number(key.slice(2)));
    }
    // A listing removed since it was shown still has its pin's title.
    if (missing.length) {
      const rows = await db.query<{ id: number; pinId: number; title: string }>(
        `SELECT "m"."id", "m"."pinId", coalesce(nullif("p"."productName", ''), "p"."title") AS "title"
         FROM "Merchant" AS "m" JOIN "Pin" AS "p" ON "p"."id" = "m"."pinId" WHERE "m"."id" = ANY($1::integer[])`,
        [missing],
      );
      for (const r of rows) out[`m:${r.id}`] = { kind: 'product', program: null, title: r.title, pinId: r.pinId };
    }
    return out;
  }
}

// A slot's click-through rate per ad over the trailing window, and the
// slot's own average to shrink toward (performanceWeight in src/lib/ads.ts).
async function loadPerformance(slot: AdSlot): Promise<Performance> {
  const [impressions, clicks] = await Promise.all([
    db.query<{ adKey: string; impressions: number }>(
      `SELECT "adKey", SUM("count")::int AS "impressions" FROM "AdImpression"
       WHERE "slot" = $1 AND "day" >= (now() AT TIME ZONE 'UTC')::date - $2::integer
       GROUP BY "adKey"`,
      [slot, PERFORMANCE_WINDOW_DAYS],
    ),
    db.query<{ adKey: string; clicks: number }>(
      `SELECT "adKey", count(*)::int AS "clicks" FROM "AdClick"
       WHERE "slot" = $1 AND "utcCreatedDateTime" >= now() - make_interval(days => $2::integer)
       GROUP BY "adKey"`,
      [slot, PERFORMANCE_WINDOW_DAYS],
    ),
  ]);
  const byKey = new Map<string, AdPerformance>();
  for (const row of impressions) byKey.set(row.adKey, { impressions: row.impressions, clicks: 0 });
  for (const row of clicks) byKey.set(row.adKey, { impressions: byKey.get(row.adKey)?.impressions ?? 0, clicks: row.clicks });
  let totalImpressions = 0;
  let totalClicks = 0;
  for (const stats of byKey.values()) {
    totalImpressions += stats.impressions;
    totalClicks += stats.clicks;
  }
  return { baselineCtr: totalImpressions ? totalClicks / totalImpressions : 0, byKey };
}

async function loadInventory(): Promise<Inventory> {
  const [programs, products, setting] = await Promise.all([
    db.query<{
      id: number;
      program: string;
      kind: AdKind;
      store: string;
      url: string;
      categories: string[];
      weight: number;
      rewardUsd: number | null;
      minAge: number;
      targetAgeFrom: number | null;
      targetAgeTo: number | null;
    }>(
      `SELECT "id", "program", "kind", "store", "url", "categories", "weight", "rewardUsd"::float8 AS "rewardUsd", "minAge", "targetAgeFrom", "targetAgeTo"
       FROM "Ad" WHERE "active" AND "weight" > 0`,
    ),
    // Amazon US listings on live pins; the same pin's other listings are
    // separate ads.
    db.query<{ id: number; pinId: number; url: string; price: number | null; title: string; company: string | null; categories: string[] }>(
      `SELECT "m"."id", "m"."pinId", "m"."url", "m"."price"::float8 AS "price",
         coalesce(nullif("p"."productName", ''), "p"."title") AS "title", "c"."name"::text AS "company",
         coalesce((SELECT array_agg("t"."name"::text ORDER BY "t"."id") FROM "PinTag" AS "t" WHERE "t"."pinId" = "p"."id" AND "t"."kind" = 'category'), '{}') AS "categories"
       FROM "Merchant" AS "m"
         JOIN "Pin" AS "p" ON "p"."id" = "m"."pinId" AND "p"."utcDeletedDateTime" IS NULL
         LEFT JOIN "Company" AS "c" ON "c"."id" = "p"."companyId"
       WHERE "m"."url" ~* '^https?://(www\\.|smile\\.)?amazon\\.com/' AND "m"."url" !~* '/gp/video/'`,
    ),
    db.query<{ value: unknown }>(`SELECT "value" FROM "AppSetting" WHERE "key" = 'amazonTags'`),
  ]);
  const pictures = await PinView.pictures([...new Set(products.map((p) => p.pinId))]);
  const ads: AdCandidate[] = [
    ...programs.map(
      (row): AdCandidate => ({
        key: `ad:${row.id}`,
        kind: row.kind,
        program: row.program,
        url: row.url,
        store: row.store,
        categories: row.categories,
        company: null,
        weight: row.weight,
        rewardUsd: row.rewardUsd,
        minAge: row.minAge,
        targetAgeFrom: row.targetAgeFrom,
        targetAgeTo: row.targetAgeTo,
        pinId: null,
        title: null,
        price: null,
        thumbName: null,
        originalUrl: null,
      }),
    ),
    ...products.map(
      (row): AdCandidate => ({
        key: `m:${row.id}`,
        kind: 'product',
        program: null,
        url: row.url,
        store: 'US',
        categories: row.categories,
        company: row.company,
        weight: 1,
        rewardUsd: null,
        minAge: 0,
        targetAgeFrom: null,
        targetAgeTo: null,
        pinId: row.pinId,
        title: row.title,
        price: row.price,
        thumbName: pictures.get(row.pinId)?.thumbName ?? null,
        originalUrl: pictures.get(row.pinId)?.originalUrl ?? null,
      }),
    ),
  ];
  return { ads, tags: parseAmazonTags(setting[0]?.value), storesWithAds: new Set(ads.map((ad) => ad.store)), at: Date.now() };
}

// Where the viewer is: the address's country, else the region their browser's
// language names. Null when neither says.
async function viewerCountry(request: NextRequest): Promise<string | null> {
  const ip = clientIp(request);
  if (ip) {
    const found = await Promise.race([
      countryOf(ip).catch(() => null),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), COUNTRY_WAIT_MS).unref?.()),
    ]);
    if (found) return found;
  }
  return regionFromAcceptLanguage(request.headers.get('accept-language'));
}

async function viewerFacts(userId: number) {
  const [rows, preference] = await Promise.all([
    db.query<{ birthday: string | null }>(`SELECT to_char("birthday", 'YYYY-MM-DD') AS "birthday" FROM "User" WHERE "id" = $1`, [userId]),
    viewerPreference(userId).catch(() => null),
  ]);
  return { birthday: rows[0]?.birthday ?? null, preference };
}

async function pinFacts(pinId: number): Promise<AdContext['pin']> {
  const rows = await db.query<{ categories: string[]; tags: string[]; company: string | null }>(
    `SELECT "c"."name"::text AS "company",
       coalesce((SELECT array_agg("t"."name"::text) FILTER (WHERE "t"."kind" = 'category') FROM "PinTag" AS "t" WHERE "t"."pinId" = "p"."id"), '{}') AS "categories",
       coalesce((SELECT array_agg("t"."name"::text) FILTER (WHERE "t"."kind" <> 'category') FROM "PinTag" AS "t" WHERE "t"."pinId" = "p"."id"), '{}') AS "tags"
     FROM "Pin" AS "p" LEFT JOIN "Company" AS "c" ON "c"."id" = "p"."companyId"
     WHERE "p"."id" = $1 AND "p"."utcDeletedDateTime" IS NULL`,
    [pinId],
  );
  return rows[0] ? { id: pinId, ...rows[0] } : null;
}

async function recordImpressions(ads: AdCandidate[], slot: AdSlot, store: string) {
  await db.query(
    `INSERT INTO "AdImpression" ("day", "adKey", "kind", "slot", "store", "count")
     SELECT (now() AT TIME ZONE 'UTC')::date, "u"."key", "u"."kind", $3::varchar, $4::varchar, 1
     FROM unnest($1::varchar[], $2::varchar[]) AS "u" ("key", "kind")
     ON CONFLICT ("day", "adKey", "slot", "store") DO UPDATE SET "count" = "AdImpression"."count" + 1`,
    [ads.map((ad) => ad.key), ads.map((ad) => ad.kind), slot, store],
  );
}
