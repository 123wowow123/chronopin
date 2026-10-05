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
  expandAvoid,
  GLOBAL_EARNING_STORES,
  MIN_AD_AGE,
  parseAmazonTags,
  pickAds,
  pickHolidayAds,
  PIN_SLOTS,
  HOLIDAY_COUNT,
  regionFromAcceptLanguage,
  servingStore,
  storeForLocale,
  tagForStore,
  taggedAdUrl,
} from '@/lib/ads';
import { WINDOW_AFTER_DAYS, WINDOW_BEFORE_DAYS, type AdTier } from '@/lib/culturalDays';
import * as db from '../db';
import { holidayLabel, holidaysInWindow, occurrencesOn } from '../culturalDays';
import { clientIp } from '../http';
import { countryOf } from '../ipLocation';
import { viewerPreference } from '../services/pages';
import { localizePins } from '../services/translations';
import type { Locale } from '@/lib/i18n/config';
import { locateUnlocated } from './ipPlaces';
import HolidayAdTranslation from './holidayAdTranslation';
import PinAdTranslation from './pinAdTranslation';
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

export type AdServeInput = { slot: AdSlot; n: number; pinId: number | null; avoid: Set<string>; userId: number | null; admin?: boolean; locale?: Locale; request: NextRequest };

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
  // signed-in viewer under MIN_AD_AGE. An admin's views are not counted.
  static async serve({ slot, n, pinId, avoid, userId, admin = false, locale = 'en', request }: AdServeInput): Promise<{ store: string; ads: AdJson[] }> {
    const [inventory, country, viewer, pin, performance] = await Promise.all([
      Ad.inventory(),
      viewerCountry(request),
      userId != null ? viewerFacts(userId) : null,
      pinId != null ? pinFacts(pinId) : null,
      Ad.performance(slot).catch(() => undefined),
    ]);
    const age = ageOn(viewer?.birthday);
    if (age != null && age < MIN_AD_AGE) return { store: 'US', ads: [] };
    const store = servingStore(country ?? storeForLocale(locale), inventory.tags, inventory.storesWithAds);
    const ctx: AdContext = { preference: viewer?.preference ?? null, age, pin, performance };
    // Under Global Earning an amazon.com product link is sent by Amazon to the
    // shopper's local store, so the US product ads serve there too (without
    // their dollar price); program ads are the store's own.
    const abroad = store !== 'US' && GLOBAL_EARNING_STORES.has(store);
    const candidates = inventory.ads.filter((ad) => ad.store === store || (abroad && ad.kind === 'product' && ad.store === 'US'));
    // The goods of a holiday in its window (a month before to three weeks
    // after), a tile for each price tier, first in the slot. A pin's page
    // carries those of the holiday the pin falls on whatever today is.
    const onPinPage = PIN_SLOTS.includes(slot);
    const related = onPinPage ? new Set(pin?.day ? occurrencesOn(pin.day).map((o) => o.def.id) : []) : null;
    const active = related ? [...related].map((id) => ({ id, offset: 0 })) : holidaysInWindow(new Date().toISOString().slice(0, 10), WINDOW_BEFORE_DAYS, WINDOW_AFTER_DAYS);
    const holidayAds = related && !related.size ? [] : pickHolidayAds(candidates, ctx, active, Math.min(HOLIDAY_COUNT[slot], n), related, expandAvoid(candidates, avoid));
    const rest = pickAds(candidates, ctx, n - holidayAds.length, expandAvoid(candidates, new Set([...avoid, ...holidayAds.map((ad) => ad.key)])));
    const picked = [...holidayAds, ...rest];
    if (picked.length && !admin) await recordImpressions(picked, slot, store, (ad) => tagForStore(ad.store, inventory.tags) ?? '', userId != null);
    const titles = await localizedTitles(picked, locale);
    return {
      store,
      ads: picked.map((ad) => ({
        key: ad.key,
        kind: ad.kind,
        program: ad.program,
        url: taggedAdUrl(ad.url, ad.store, inventory.tags),
        title: titles.get(ad.key) ?? ad.title,
        price: ad.store === store ? ad.price : null,
        currency: ad.price != null && ad.store === store ? 'USD' : null,
        brand: ad.kind === 'product' ? (ad.brand ?? ad.company) : null,
        rating: ad.rating ?? null,
        // A price in another store's currency is no price here, nor is its stock.
        urgency: ad.store === store ? (ad.urgency ?? null) : null,
        pinId: ad.pinId,
        category: ad.categories[0] ?? null,
        thumbName: ad.thumbName,
        originalUrl: ad.originalUrl,
        imageUrl: ad.imageUrl ?? null,
        holiday: ad.holiday ? holidayLabel(ad.holiday, locale) : null,
        store,
      })),
    };
  }

  // One click, unless it repeats the same person's click on the same ad
  // within REPEAT_SECONDS or names an ad that does not exist. Answers whether
  // it was recorded.
  // `store` is the one the ad was served from, when the page says (else the ad's own).
  static async recordClick(click: { adKey: string; slot: AdSlot; pinId: number | null; userId: number | null; ip: string | null; page: string | null; store?: string | null }): Promise<boolean> {
    const { ads, tags } = await Ad.inventory();
    const ad = ads.find((a) => a.key === click.adKey);
    if (!ad) return false;
    const rows = await db.query(
      `INSERT INTO "AdClick" ("adKey", "kind", "program", "adPinId", "slot", "pinId", "store", "url", "userId", "ip", "page", "tag")
       SELECT $1::varchar, $2::varchar, $3::varchar, $4::integer, $5::varchar, $6::integer, $7::varchar, $8::text, $9::integer, $10::inet, $12::text, $13::varchar
       WHERE NOT EXISTS (
         SELECT 1 FROM "AdClick" AS "c"
         WHERE "c"."adKey" = $1::varchar
           AND ("c"."userId" = $9::integer OR ($9::integer IS NULL AND "c"."userId" IS NULL AND "c"."ip" = $10::inet))
           AND "c"."utcCreatedDateTime" > now() - make_interval(secs => $11::integer)
       )
       RETURNING "id"`,
      [ad.key, ad.kind, ad.program, ad.pinId, click.slot, click.pinId, click.store ?? ad.store, taggedAdUrl(ad.url, ad.store, tags), click.userId, click.ip, REPEAT_SECONDS, click.page, tagForStore(ad.store, tags)],
    );
    return rows.length > 0;
  }

  // The ads and store ids are read again on the next request (after an admin
  // changes them).
  static expireInventory() {
    held.inventory = null;
  }

  // How many working program ads each store has.
  static async storeAdCounts(): Promise<Record<string, number>> {
    const rows = await db.query<{ store: string; count: number }>(`SELECT "store", count(*)::int AS "count" FROM "Ad" WHERE "active" AND "weight" > 0 GROUP BY "store"`);
    return Object.fromEntries(rows.map((r) => [r.store, r.count]));
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
         "c"."pinId", "p"."title" AS "pinTitle", "c"."page", "c"."store", "c"."tag", "c"."userId", "u"."userName", host("c"."ip") AS "ip",
         "c"."country", "c"."region", "c"."city", "c"."latitude", "c"."longitude"
       FROM "AdClick" AS "c"
         LEFT JOIN "Pin" AS "ap" ON "ap"."id" = "c"."adPinId"
         LEFT JOIN "Pin" AS "p" ON "p"."id" = "c"."pinId"
         LEFT JOIN "User" AS "u" ON "u"."id" = "c"."userId"
       WHERE "u"."role" IS DISTINCT FROM 'admin'
       ORDER BY "c"."utcCreatedDateTime" DESC, "c"."id" DESC
       LIMIT $1`,
      [CLICK_LIMIT],
    );
    const pictures = await PinView.pictures([...new Set(rows.flatMap((r) => (r.adPinId != null ? [r.adPinId] : [])))]);
    return rows.map((r) => ({ ...r, ...(r.adPinId != null ? pictures.get(r.adPinId) : undefined) }));
  }

  static impressions(): Promise<AdImpressionRow[]> {
    return db.query<AdImpressionRow>(
      `SELECT to_char("day", 'YYYY-MM-DD') AS "day", "adKey", "kind", "slot", "store", "tag", "signedIn", "count"
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
    const chosenRows: number[] = [];
    const holidayRows: number[] = [];
    for (const key of keys) {
      const ad = byKey.get(key);
      if (ad) out[key] = { kind: ad.kind, program: ad.program, title: ad.title, pinId: ad.pinId };
      else if (key.startsWith('m:')) missing.push(Number(key.slice(2)));
      else if (key.startsWith('p:')) chosenRows.push(Number(key.slice(2)));
      else if (key.startsWith('h:')) holidayRows.push(Number(key.slice(2)));
    }
    // A holiday ad marked broken since is not served, but is still named.
    if (holidayRows.length) {
      const rows = await db.query<{ id: number; title: string }>(`SELECT "id", "title" FROM "HolidayAd" WHERE "id" = ANY($1::integer[])`, [holidayRows]);
      for (const r of rows) out[`h:${r.id}`] = { kind: 'product', program: null, title: r.title, pinId: null };
    }
    // A chosen ad marked broken since is not served, but is still named.
    if (chosenRows.length) {
      const rows = await db.query<{ id: number; pinId: number; title: string }>(`SELECT "id", "pinId", "title" FROM "PinAd" WHERE "id" = ANY($1::integer[])`, [chosenRows]);
      for (const r of rows) out[`p:${r.id}`] = { kind: 'product', program: null, title: r.title, pinId: r.pinId };
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

// The picked ads' titles in the viewer's language: a chosen ad's through its
// PinAdTranslation (0115), a holiday ad's through HolidayAdTranslation (0129), a listing named after its pin through the pin's own
// translation. An ad with none keeps its English title.
async function localizedTitles(ads: AdCandidate[], locale: Locale): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (locale === 'en') return out;
  try {
    const chosen = new Map<number, string>();
    for (const ad of ads) if (ad.key.startsWith('p:') && ad.title) chosen.set(Number(ad.key.slice(2)), ad.title);
    const translated = await PinAdTranslation.forAds(chosen, locale);
    for (const [id, title] of translated) out.set(`p:${id}`, title);
    const holiday = new Map<number, string>();
    for (const ad of ads) if (ad.key.startsWith('h:') && ad.title) holiday.set(Number(ad.key.slice(2)), ad.title);
    for (const [id, title] of await HolidayAdTranslation.forAds(holiday, locale)) out.set(`h:${id}`, title);
    const named = ads.filter((ad) => ad.titleFromPin && ad.pinId != null && ad.title);
    const pins = await localizePins(named.map((ad) => ({ id: ad.pinId as number, title: ad.title as string })), locale);
    named.forEach((ad, i) => pins[i].title !== ad.title && out.set(ad.key, pins[i].title));
  } catch {
    // Untranslated is still a working ad.
  }
  return out;
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
         AND ("userId" IS NULL OR "userId" NOT IN (SELECT "id" FROM "User" WHERE "role" = 'admin'))
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
  const [programs, products, setting, chosen] = await Promise.all([
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
    // separate ads. `categories` holds all the pin's tags (topics too: a
    // Watches pin's ad suits another Watches pin), compared with the viewed
    // pin's in relatedness().
    db.query<{ id: number; pinId: number; url: string; price: number | null; rating: number | null; reviewCount: number | null; brand: string | null; title: string; titleFromPin: boolean; company: string | null; categories: string[] }>(
      `SELECT "m"."id", "m"."pinId", "m"."url", "m"."price"::float8 AS "price", "m"."rating"::float8 AS "rating", "m"."reviewCount", "m"."brand",
         coalesce(nullif("p"."productName", ''), "p"."title") AS "title", nullif("p"."productName", '') IS NULL AS "titleFromPin", "c"."name"::text AS "company",
         coalesce((SELECT array_agg("t"."name"::text ORDER BY "t"."id") FROM "PinTag" AS "t" WHERE "t"."pinId" = "p"."id"), '{}') AS "categories"
       FROM "Merchant" AS "m"
         JOIN "Pin" AS "p" ON "p"."id" = "m"."pinId" AND "p"."utcDeletedDateTime" IS NULL
         LEFT JOIN "Company" AS "c" ON "c"."id" = "p"."companyId"
       WHERE "m"."url" ~* '^https?://(www\\.|smile\\.)?amazon\\.com/' AND "m"."url" !~* '/gp/video/'`,
    ),
    db.query<{ value: unknown }>(`SELECT "value" FROM "AppSetting" WHERE "key" = 'amazonTags'`),
    // Ads chosen for a pin (0112), working ones on live pins.
    db.query<{ id: number; pinId: number; url: string; price: number | null; rating: number | null; reviewCount: number | null; urgency: string | null; title: string; brand: string | null; categories: string[] }>(
      `SELECT "a"."id", "a"."pinId", "a"."url", "a"."price"::float8 AS "price", "a"."rating"::float8 AS "rating", "a"."reviewCount", "a"."urgency", "a"."title", "a"."brand",
         coalesce((SELECT array_agg("t"."name"::text ORDER BY "t"."id") FROM "PinTag" AS "t" WHERE "t"."pinId" = "p"."id"), '{}') AS "categories"
       FROM "PinAd" AS "a" JOIN "Pin" AS "p" ON "p"."id" = "a"."pinId" AND "p"."utcDeletedDateTime" IS NULL
       WHERE "a"."status" = 'ok'`,
    ),
  ]);
  // The goods of the cultural holidays (0121); served only in a holiday's window.
  const holidayRows = await db.query<{ id: number; holiday: string; tier: AdTier; url: string; title: string; brand: string | null; price: number | null; rating: number | null; image: string | null }>(
    `SELECT "id", "holiday", "tier", "url", "title", "brand", "price"::float8 AS "price", "rating"::float8 AS "rating", "image" FROM "HolidayAd" WHERE "status" = 'ok'`,
  );
  const chosenPictures = await PinView.pictures([...new Set(chosen.map((c) => c.pinId))]);
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
        forPinId: null,
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
        forPinId: null,
        title: row.title,
        titleFromPin: row.titleFromPin,
        price: row.price,
        rating: row.rating,
        reviewCount: row.reviewCount,
        brand: row.brand,
        thumbName: pictures.get(row.pinId)?.thumbName ?? null,
        originalUrl: pictures.get(row.pinId)?.originalUrl ?? null,
      }),
    ),
    ...chosen.map(
      (row): AdCandidate => ({
        key: `p:${row.id}`,
        kind: 'product',
        program: null,
        url: row.url,
        store: 'US',
        categories: row.categories,
        // The listing's brand, so a pin of the same company counts it related.
        company: row.brand,
        // Chosen and vetted, so a little ahead of a listing that is only on a pin.
        weight: 1.5,
        rewardUsd: null,
        minAge: 0,
        targetAgeFrom: null,
        targetAgeTo: null,
        pinId: row.pinId,
        forPinId: row.pinId,
        title: row.title,
        price: row.price,
        rating: row.rating,
        reviewCount: row.reviewCount,
        urgency: row.urgency,
        thumbName: chosenPictures.get(row.pinId)?.thumbName ?? null,
        originalUrl: chosenPictures.get(row.pinId)?.originalUrl ?? null,
      }),
    ),
  ];
  ads.push(
    ...holidayRows.map(
      (row): AdCandidate => ({
        key: `h:${row.id}`,
        kind: 'product',
        program: null,
        url: row.url,
        store: 'US',
        categories: [],
        company: row.brand,
        weight: 1,
        rewardUsd: null,
        minAge: 0,
        targetAgeFrom: null,
        targetAgeTo: null,
        pinId: null,
        forPinId: null,
        title: row.title,
        price: row.price,
        rating: row.rating,
        thumbName: null,
        originalUrl: null,
        holiday: row.holiday,
        tier: row.tier,
        imageUrl: row.image,
      }),
    ),
  );
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
  const rows = await db.query<{ categories: string[]; tags: string[]; company: string | null; day: string | null }>(
    `SELECT "c"."name"::text AS "company", to_char("p"."utcStartDateTime" AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS "day",
       coalesce((SELECT array_agg("t"."name"::text) FILTER (WHERE "t"."kind" = 'category') FROM "PinTag" AS "t" WHERE "t"."pinId" = "p"."id"), '{}') AS "categories",
       coalesce((SELECT array_agg("t"."name"::text) FILTER (WHERE "t"."kind" <> 'category') FROM "PinTag" AS "t" WHERE "t"."pinId" = "p"."id"), '{}') AS "tags"
     FROM "Pin" AS "p" LEFT JOIN "Company" AS "c" ON "c"."id" = "p"."companyId"
     WHERE "p"."id" = $1 AND "p"."utcDeletedDateTime" IS NULL`,
    [pinId],
  );
  return rows[0] ? { id: pinId, ...rows[0] } : null;
}

// `store` is the viewer's; each ad's `tag` is the id on its own link.
async function recordImpressions(ads: AdCandidate[], slot: AdSlot, store: string, tagOf: (ad: AdCandidate) => string, signedIn: boolean) {
  await db.query(
    `INSERT INTO "AdImpression" ("day", "adKey", "kind", "slot", "store", "tag", "signedIn", "count")
     SELECT (now() AT TIME ZONE 'UTC')::date, "u"."key", "u"."kind", $3::varchar, $4::varchar, "u"."tag", $5::boolean, 1
     FROM unnest($1::varchar[], $2::varchar[], $6::varchar[]) AS "u" ("key", "kind", "tag")
     ON CONFLICT ("day", "adKey", "slot", "store", "signedIn", "tag") DO UPDATE SET "count" = "AdImpression"."count" + 1`,
    [ads.map((ad) => ad.key), ads.map((ad) => ad.kind), slot, store, signedIn, ads.map(tagOf)],
  );
}
