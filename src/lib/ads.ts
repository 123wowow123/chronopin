// Ad blocks: which Amazon Associates ads a slot shows, and where their links go.
// Pure, so the picking is the same in tests as on the server (src/server/model/ad.ts).
//
// Program ads (the "Ad" table, 0110) are Amazon's Special Program Commissions,
// Bonus Events and Trade-In, preferred over product ads (the Amazon listings
// on pins). Each kind is a pool with a fixed share of the picks, however many
// ads it holds, so a hundred product listings do not crowd out eight
// programs; inside a pool an ad's own weight decides. On top of that an ad
// weighs more for a viewer whose preference wiki leans to its categories or
// company, whose age is in its target range, and - in a pin page's slots -
// for being related to the pin. Two more factors ride on top, each kept
// small on purpose: the program's own bounty (rewardWeight, a richer payout
// nudges its odds) and how well it has actually converted in that specific
// slot (performanceWeight, a Bayesian shrinkage to the slot's own average
// click rate - the same ad can out- or under-perform in the timeline versus
// a pin page, so this is tracked and weighed per slot, not globally).

import type { UserPreference } from './userWiki';
import { amazonAssociateTag } from './affiliate';
import { asinOf, sameBrand } from './adQuality';

export type AdKind = 'special' | 'bonus' | 'tradein' | 'product';

// Each kind's share of the picks, before relatedness and preference.
export const KIND_SHARE: Record<AdKind, number> = { special: 4, bonus: 2, tradein: 2, product: 2 };

export const AD_SLOTS = ['timeline-row', 'timeline-side', 'pin-strip', 'pin-side', 'drawer'] as const;
export type AdSlot = (typeof AD_SLOTS)[number];
// How many ads a slot asks for at most: what it shows at its widest. The
// side panel stops at five however tall the window is.
export const SLOT_COUNT: Record<AdSlot, number> = { 'timeline-row': 7, 'timeline-side': 5, 'pin-strip': 2, 'pin-side': 5, drawer: 2 };
// Slots on a pin's page, whose ads are its related ones first.
export const PIN_SLOTS: readonly AdSlot[] = ['pin-strip', 'pin-side'];

export function isAdSlot(value: unknown): value is AdSlot {
  return typeof value === 'string' && (AD_SLOTS as readonly string[]).includes(value);
}

// One ad that could be shown.
export type AdCandidate = {
  key: string;
  kind: AdKind;
  // The program's message key (ads.programs.<program>), for a program ad.
  program: string | null;
  // The listing, untagged; the tag is added for the store when served.
  url: string;
  store: string;
  categories: string[];
  company: string | null;
  weight: number;
  // What a conversion on this program is worth, from the account's own rate
  // card (null for a product ad, and for a percentage program like Trade-In
  // whose payout depends on what is traded in, not a flat bounty).
  rewardUsd: number | null;
  minAge: number;
  targetAgeFrom: number | null;
  targetAgeTo: number | null;
  // A product ad's pin and what it shows.
  pinId: number | null;
  // The pin a chosen ad (PinAd, 0112) was picked for: first in that pin's
  // slots, and not hidden there like a pin's own listing is.
  forPinId: number | null;
  title: string | null;
  price: number | null;
  thumbName: string | null;
  originalUrl: string | null;
};

// What a served ad carries to the browser.
export type AdJson = {
  key: string;
  kind: AdKind;
  program: string | null;
  url: string;
  title: string | null;
  price: number | null;
  currency: string | null;
  pinId: number | null;
  category: string | null;
  thumbName: string | null;
  originalUrl: string | null;
};

// Rows of the admin Ads page (src/server/model/ad.ts).
export type AdClickRow = {
  id: number;
  at: string;
  adKey: string;
  kind: AdKind;
  program: string | null;
  adPinId: number | null;
  adTitle: string | null;
  slot: string;
  pinId: number | null;
  pinTitle: string | null;
  // The page's path and query (0111); null for older clicks.
  page: string | null;
  store: string;
  userId: number | null;
  userName: string | null;
  ip: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  thumbName?: string | null;
  originalUrl?: string | null;
};

export type AdImpressionRow = { day: string; adKey: string; kind: AdKind; slot: string; store: string; signedIn: boolean; count: number };

// A slot's own click-through history for one ad, over a trailing window
// (src/server/model/ad.ts).
export type AdPerformance = { impressions: number; clicks: number };

export type AdContext = {
  preference: UserPreference | null;
  // The viewer's age in whole years, when signed in with a birthday.
  age: number | null;
  // The pin whose page the slot is on.
  pin: { id: number; categories: string[]; tags: string[]; company: string | null } | null;
  // This slot's own recent performance, so an ad that actually gets clicked
  // more *here* shows more here, even where it does worse in other slots.
  // Undefined (not yet computed, or too little traffic to bother) leaves
  // every ad's performanceWeight at 1.
  performance?: { baselineCtr: number; byKey: Map<string, AdPerformance> };
};

// No ads at all, and nothing counted, for a signed-in viewer under this age.
export const MIN_AD_AGE = 13;
// A product ad needs no account of its own, so younger teens may see one.
export const PRODUCT_MIN_AGE = MIN_AD_AGE;
const AFFINITY_BOOST = 2;
const AGE_BOOST = 2;
const RELATED_CATEGORY_BOOST = 3;
const RELATED_COMPANY_BOOST = 4;
// A product chosen for this very pin outranks any merely related one; one
// whose brand is the pin's company (a Tamiya kit on a Tamiya pin) more so
// (owner, 2026-10-02: "the pin brand should influence the product").
const CHOSEN_FOR_PIN_BOOST = 12;
const CHOSEN_BRAND_BOOST = 8;

// A reward of this many dollars neither boosts nor discounts an ad; the
// richest programs ($40 Prime) and the thinnest ($1 Fresh) land at the clamp
// either side of it. Square-rooted and clamped tightly, so a bigger bounty
// nudges the pick toward it without letting dollars alone decide - "slightly
// more weight" (owner, 2026-10-02), on top of whatever performance and
// personal weight already say.
const REWARD_BASELINE_USD = 10;
const REWARD_WEIGHT_MIN = 0.75;
const REWARD_WEIGHT_MAX = 1.5;

// How much more (or less) often an ad shows for how it has actually
// converted *in this slot*, relative to the slot's own average click
// rate - a Bayesian shrinkage to that average, weighted as if the baseline
// came from this many impressions of its own, so one lucky click on a
// freshly added ad or a lightly-trafficked slot cannot swing the result.
const PERFORMANCE_PRIOR_IMPRESSIONS = 200;
const PERFORMANCE_WEIGHT_MIN = 0.5;
const PERFORMANCE_WEIGHT_MAX = 2;

// A program's own payout nudges its weight: richer bounties earn a slightly
// better shot at being picked. 1 for a product ad or a percentage program
// (Trade-In) with no flat dollar figure to compare.
export function rewardWeight(ad: Pick<AdCandidate, 'rewardUsd'>): number {
  if (ad.rewardUsd == null || ad.rewardUsd <= 0) return 1;
  const lift = Math.sqrt(ad.rewardUsd / REWARD_BASELINE_USD);
  return Math.min(REWARD_WEIGHT_MAX, Math.max(REWARD_WEIGHT_MIN, lift));
}

// This slot's own history for the ad, shrunk toward the slot's average click
// rate. 1 when the slot has no performance data yet (baselineCtr 0).
export function performanceWeight(stats: AdPerformance | undefined, baselineCtr: number): number {
  if (!baselineCtr) return 1;
  const impressions = stats?.impressions ?? 0;
  const clicks = stats?.clicks ?? 0;
  const smoothedCtr = (clicks + PERFORMANCE_PRIOR_IMPRESSIONS * baselineCtr) / (impressions + PERFORMANCE_PRIOR_IMPRESSIONS);
  const lift = smoothedCtr / baselineCtr;
  return Math.min(PERFORMANCE_WEIGHT_MAX, Math.max(PERFORMANCE_WEIGHT_MIN, lift));
}

// Age in whole years on `now`'s UTC date, from a "YYYY-MM-DD" birthday.
export function ageOn(birthday: string | null | undefined, now = new Date()): number | null {
  const match = birthday ? /^(\d{4})-(\d{2})-(\d{2})/.exec(birthday) : null;
  if (!match) return null;
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  let age = now.getUTCFullYear() - y;
  if (now.getUTCMonth() + 1 < m || (now.getUTCMonth() + 1 === m && now.getUTCDate() < d)) age -= 1;
  return age >= 0 && age < 150 ? age : null;
}

const lower = (names: string[]) => names.map((n) => n.toLowerCase());

// How related an ad is to the pin: shared categories or tags, and the same
// company. 0 when nothing is shared.
export function relatedness(ad: AdCandidate, pin: AdContext['pin']): number {
  if (!pin) return 0;
  const pinNames = new Set(lower([...pin.categories, ...pin.tags]));
  const shared = lower(ad.categories).filter((c) => pinNames.has(c)).length;
  const sameCompany = sameBrand(ad.company, pin.company);
  const chosen = ad.forPinId === pin.id ? CHOSEN_FOR_PIN_BOOST + (sameCompany ? CHOSEN_BRAND_BOOST : 0) : 0;
  return RELATED_CATEGORY_BOOST * Math.min(shared, 2) + (sameCompany ? RELATED_COMPANY_BOOST : 0) + chosen;
}

// Whether the viewer may see the ad at all: old enough, and not the product
// whose own buy buttons are already on the page (a chosen ad is the exception).
export function adAllowed(ad: AdCandidate, ctx: AdContext): boolean {
  if (ctx.pin && ad.pinId === ctx.pin.id && ad.forPinId !== ctx.pin.id) return false;
  if (ctx.age == null) return true;
  return ctx.age >= Math.max(MIN_AD_AGE, ad.kind === 'product' ? PRODUCT_MIN_AGE : ad.minAge);
}

// The ad's weight for this viewer, before its pool's share is applied.
export function personalWeight(ad: AdCandidate, ctx: AdContext): number {
  let weight = ad.weight;
  const pref = ctx.preference;
  if (pref) {
    const categories = new Map(pref.categories.map((a) => [a.name.toLowerCase(), a.share]));
    const companies = new Map(pref.companies.map((a) => [a.name.toLowerCase(), a.share]));
    const leaning =
      Math.min(1, lower(ad.categories).reduce((sum, c) => sum + (categories.get(c) ?? 0), 0)) +
      (ad.company ? (companies.get(ad.company.toLowerCase()) ?? 0) : 0);
    weight *= 1 + AFFINITY_BOOST * leaning;
  }
  if (ctx.age != null && (ad.targetAgeFrom != null || ad.targetAgeTo != null)) {
    const inRange = ctx.age >= (ad.targetAgeFrom ?? 0) && ctx.age <= (ad.targetAgeTo ?? 200);
    if (inRange) weight *= AGE_BOOST;
  }
  return weight;
}

// What an ad is, whichever key it has: an Amazon product by its ASIN (the same
// product can be a pin's own listing, another pin's, and a chosen ad), a
// program by its link. Two ads with one product key are the same ad to a viewer.
export function productKey(ad: Pick<AdCandidate, 'url' | 'key'>): string {
  const asin = asinOf(ad.url);
  return asin ? `asin:${asin}` : ad.key;
}

// The keys to avoid, widened to every ad that is the same product as one
// already on the page.
export function expandAvoid(candidates: AdCandidate[], avoid: Set<string>): Set<string> {
  if (!avoid.size) return avoid;
  const products = new Set(candidates.filter((ad) => avoid.has(ad.key)).map(productKey));
  const widened = new Set(avoid);
  for (const ad of candidates) if (products.has(productKey(ad))) widened.add(ad.key);
  return widened;
}

// Up to n ads, a weighted random pick without repeats. On a pin's page the
// ads chosen for the pin come first, then the related ones. Keys in `avoid` (already shown elsewhere on the
// page) are only used once the rest run out.
export function pickAds(candidates: AdCandidate[], ctx: AdContext, n: number, avoid: Set<string> = new Set(), random = Math.random): AdCandidate[] {
  const allowed = candidates.filter((ad) => adAllowed(ad, ctx));
  const poolTotals = new Map<AdKind, number>();
  for (const ad of allowed) poolTotals.set(ad.kind, (poolTotals.get(ad.kind) ?? 0) + ad.weight);
  const weighed = allowed
    .map((ad) => {
      const total = poolTotals.get(ad.kind) || 1;
      const related = relatedness(ad, ctx.pin);
      const performance = performanceWeight(ctx.performance?.byKey.get(ad.key), ctx.performance?.baselineCtr ?? 0);
      const weight = (KIND_SHARE[ad.kind] / total) * personalWeight(ad, ctx) * (1 + related) * performance * rewardWeight(ad);
      // Efraimidis-Spirakis: the n smallest -ln(u)/w are a weighted sample.
      return { ad, related, own: ctx.pin != null && ad.forPinId === ctx.pin.id, fresh: !avoid.has(ad.key), score: weight > 0 ? -Math.log(1 - random()) / weight : Infinity };
    })
    .filter((w) => w.score !== Infinity);
  weighed.sort((a, b) => Number(b.fresh) - Number(a.fresh) || Number(b.own) - Number(a.own) || (ctx.pin ? Number(b.related > 0) - Number(a.related > 0) : 0) || a.score - b.score);
  // One ad per product: a listing that is both a pin's own and a chosen ad
  // is shown once, by whichever ranked first.
  const seen = new Set<string>();
  const picked: AdCandidate[] = [];
  for (const { ad } of weighed) {
    const product = productKey(ad);
    if (seen.has(product)) continue;
    seen.add(product);
    picked.push(ad);
    if (picked.length === n) break;
  }
  return picked;
}

// Amazon's stores by the country they sell to. A country with no store of its
// own shops at the one it is sent to here.
export const AMAZON_STORES: Record<string, string> = {
  US: 'www.amazon.com',
  CA: 'www.amazon.ca',
  MX: 'www.amazon.com.mx',
  BR: 'www.amazon.com.br',
  GB: 'www.amazon.co.uk',
  IE: 'www.amazon.ie',
  DE: 'www.amazon.de',
  FR: 'www.amazon.fr',
  IT: 'www.amazon.it',
  ES: 'www.amazon.es',
  NL: 'www.amazon.nl',
  BE: 'www.amazon.com.be',
  SE: 'www.amazon.se',
  PL: 'www.amazon.pl',
  TR: 'www.amazon.com.tr',
  AE: 'www.amazon.ae',
  SA: 'www.amazon.sa',
  EG: 'www.amazon.eg',
  IN: 'www.amazon.in',
  JP: 'www.amazon.co.jp',
  SG: 'www.amazon.sg',
  AU: 'www.amazon.com.au',
};
const STORE_FOR: Record<string, string> = { AT: 'DE', CH: 'DE', LU: 'DE', LI: 'DE', NZ: 'AU', PR: 'US' };

export function storeForCountry(country: string | null | undefined): string | null {
  if (!country) return null;
  const code = country.toUpperCase();
  return AMAZON_STORES[code] ? code : (STORE_FOR[code] ?? null);
}

// The store a viewer's ads come from: their country's, when it has its own
// Associates id and ads to show, else the US.
export function servingStore(country: string | null, tags: Record<string, string>, storesWithAds: Set<string>): string {
  const store = storeForCountry(country);
  return store && store !== 'US' && tags[store] && storesWithAds.has(store) ? store : 'US';
}

// The ad's link with the store's Associates id on it.
export function taggedAdUrl(url: string, store: string, tags: Record<string, string>): string {
  const tag = store === 'US' ? amazonAssociateTag : tags[store];
  if (!tag) return url;
  try {
    const parsed = new URL(url);
    if (!/(^|\.)amazon\.[a-z.]+$/i.test(parsed.hostname)) return url;
    parsed.searchParams.set('tag', tag);
    return parsed.toString();
  } catch {
    return url;
  }
}

// The region of the first language tag that names one ("en-GB" -> "GB"):
// where a viewer probably is when the address says nothing.
export function regionFromAcceptLanguage(header: string | null | undefined): string | null {
  for (const part of (header ?? '').split(',')) {
    const match = /^[a-z]{2,3}[-_]([a-z]{2})\b/i.exec(part.trim());
    if (match) return match[1].toUpperCase();
  }
  return null;
}

// The stored Associates ids by store, from AppSetting "amazonTags" ({ "GB": "xyz-21" }).
export function parseAmazonTags(value: unknown): Record<string, string> {
  const tags: Record<string, string> = {};
  if (!value || typeof value !== 'object') return tags;
  for (const [store, tag] of Object.entries(value as Record<string, unknown>)) {
    if (AMAZON_STORES[store.toUpperCase()] && typeof tag === 'string' && /^[\w-]{3,40}$/.test(tag)) tags[store.toUpperCase()] = tag;
  }
  return tags;
}
