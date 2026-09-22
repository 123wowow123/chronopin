// Where a studio is, for putting its film, series, anime or game on the map:
// the headquarters Wikidata gives the company (P159), reached from its
// Wikipedia article. Most precise first:
//
//   1. the headquarters claim's own coordinates (P625 qualifier) and English
//      street address (P6375 qualifier), e.g. Ufotable, Toei Animation
//   2. the company's own coordinates (P625), e.g. A-1 Pictures
//   3. the headquarters place's coordinates, labelled "Suginami, Tokyo,
//      Japan", e.g. MAPPA (whose claim names only the ward)
//
// Kept on the company (0035) so a studio is looked up once.

import { categoryList, hasCategory } from '@/lib/categories';
import * as db from './db';
import { PIN_CATEGORIES } from './model/pinTag';
import { claimValue, getJson, wikiTitle } from './companyLogo';
import log from './util/log';

// The pins placed at their studio: what they are is made somewhere, but
// happens nowhere in particular.
export const STUDIO_CATEGORIES = ['Anime', 'Movie', 'TV', 'Gaming'];

// One category or a pin's list of them.
export const isStudioCategory = (categories: string | readonly (string | null | undefined)[] | null | undefined) =>
  hasCategory(categoryList(categories), STUDIO_CATEGORIES);

export type StudioLocation = { address: string; latitude: number; longitude: number };

type Claims = Record<string, any[]>;

async function entities(ids: string[], props: string): Promise<Record<string, { claims?: Claims; labels?: Record<string, { value: string }> }>> {
  if (!ids.length) return {};
  const json = await getJson(`https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=${props}&languages=en&ids=${ids.join('|')}`);
  return json.entities || {};
}

const coordinate = (value: any): { latitude: number; longitude: number } | null =>
  value && Number.isFinite(value.latitude) && Number.isFinite(value.longitude) ? { latitude: value.latitude, longitude: value.longitude } : null;

// The live headquarters claim: preferred, else a current one that carries its
// own coordinates (Ufotable lists a second, bare one), else the latest current.
function headquarters(claims: Claims) {
  const live = (claims.P159 || []).filter((c) => c.rank !== 'deprecated' && c.mainsnak?.datavalue);
  const current = live.filter((c) => !c.qualifiers?.P582);
  return (
    live.find((c) => c.rank === 'preferred') ||
    current.find((c) => c.qualifiers?.P625) ||
    current[current.length - 1] ||
    live[live.length - 1]
  );
}

// "street, place, area, country" without the places the street already names
// ("..., Nakano, Nakano-ku" then not "Nakano" again) or a county after a city.
function joinAddress(street: string | undefined, parts: string[]): string {
  const said = (street ?? '').toLowerCase();
  const kept = parts.filter((part, i) => !said.includes(part.toLowerCase()) && !(i > 0 && / County$/.test(part)));
  return [street, ...kept].filter(Boolean).join(', ');
}

// A studio's headquarters from its Wikipedia article, or null.
export async function lookupStudioLocation(wikiUrl: string | null | undefined): Promise<StudioLocation | null> {
  const title = wikiTitle(wikiUrl);
  if (!title) return null;
  const page = await getJson(
    `https://en.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&prop=pageprops&ppprop=wikibase_item&redirects=1&titles=${encodeURIComponent(title)}`,
  );
  const qid = page.query?.pages?.[0]?.pageprops?.wikibase_item;
  if (!qid) return null;
  const company = (await entities([qid], 'claims'))[qid];
  const claims = company?.claims || {};
  const hq = headquarters(claims);
  const hqId: string | undefined = hq?.mainsnak.datavalue.value?.id;

  const qualifierCoords = coordinate(hq?.qualifiers?.P625?.[0]?.datavalue?.value);
  const street = (hq?.qualifiers?.P6375 || []).map((q: any) => q.datavalue?.value).find((v: any) => v?.language === 'en')?.text as string | undefined;
  const ownCoords = coordinate(claimValue(claims.P625));

  // The headquarters place, its area and country, for a label and fallback coordinates.
  const place = hqId ? (await entities([hqId], 'labels|claims'))[hqId] : undefined;
  const placeCoords = coordinate(claimValue(place?.claims?.P625));
  const areaId: string | undefined = claimValue(place?.claims?.P131)?.id;
  const countryId: string | undefined = claimValue(place?.claims?.P17)?.id;
  const names = await entities([areaId, countryId].filter((id): id is string => !!id && id !== hqId), 'labels');
  const label = (id?: string) => (id ? (id === hqId ? place?.labels?.en?.value : names[id]?.labels?.en?.value) : undefined);
  const parts = [label(hqId), label(areaId), label(countryId)].filter((part, i, all): part is string => !!part && all.indexOf(part) === i);

  // Known only to a country or to one of its top-level regions (Kyoto
  // Animation's claim says "Japan", FX's says "Texas"): the middle of a
  // country or a state is no studio's address, so better none. A place that
  // sits inside something else (P131) is a city or a ward and is fine; a
  // place that sits inside nothing is the coarse kind.
  const tooCoarse = !qualifierCoords && !ownCoords && !street && !!hqId && !areaId;
  const coords = qualifierCoords || ownCoords || placeCoords;
  if (!coords || tooCoarse) return null;
  const address = joinAddress(street, parts);
  return address ? { address, ...coords } : null;
}

type CompanyHq = { id: number; wikiUrl: string | null; hqAddress: string | null; hqLatitude: number | null; hqLongitude: number | null; utcHqCheckedDateTime: Date | null };

// The company's headquarters, looked up the first time it is asked for. Null
// when it has no Wikipedia article or Wikidata places it nowhere.
export async function studioLocation(companyId: number): Promise<StudioLocation | null> {
  const [c] = await db.query<CompanyHq>(
    `SELECT "id", "wikiUrl", "hqAddress", "hqLatitude", "hqLongitude", "utcHqCheckedDateTime" FROM "Company" WHERE "id" = $1`,
    [companyId],
  );
  if (!c) return null;
  if (!c.utcHqCheckedDateTime) {
    let found: StudioLocation | null = null;
    try {
      found = await lookupStudioLocation(c.wikiUrl);
    } catch (err) {
      // Wikimedia unreachable: asked again next time.
      log.warn(`studio location for company ${companyId} failed:`, (err as Error).message);
      return null;
    }
    await db.query(
      `UPDATE "Company" SET "hqAddress" = $2, "hqLatitude" = $3, "hqLongitude" = $4, "utcHqCheckedDateTime" = now() WHERE "id" = $1`,
      [companyId, found?.address ?? null, found?.latitude ?? null, found?.longitude ?? null],
    );
    return found;
  }
  return c.hqAddress && c.hqLatitude != null && c.hqLongitude != null ? { address: c.hqAddress, latitude: c.hqLatitude, longitude: c.hqLongitude } : null;
}

// For a scrape: the studio's headquarters by its name, from the company's
// stored lookup when it is already known, else from the article's Wikipedia
// link (a scrape must not create the company before the pin is saved).
export async function studioLocationByName(company: string, wikiUrl: string | null | undefined): Promise<StudioLocation | null> {
  const [row] = await db.query<{ id: number }>(`SELECT "id" FROM "Company" WHERE "name" = $1`, [company.trim()]);
  if (row) return studioLocation(row.id);
  try {
    return await lookupStudioLocation(wikiUrl);
  } catch (err) {
    log.warn(`studio location for ${company} failed:`, (err as Error).message);
    return null;
  }
}

// After a save: a studio pin with no place of its own is put at its studio.
// True when it moved the pin onto the map.
export async function placeAtStudio(pinId: number): Promise<boolean> {
  // A pin that names a place of its own (a premiere, a convention hall) keeps
  // it, even without coordinates: the studio is only for a pin with none.
  const [pin] = await db.query<{ companyId: number | null; categories: string[]; placed: boolean }>(
    `SELECT "companyId", ${PIN_CATEGORIES} AS "categories", ("location" IS NOT NULL OR COALESCE("address", '') <> '') AS "placed"
     FROM "Pin" WHERE "id" = $1 AND "utcDeletedDateTime" IS NULL`,
    [pinId],
  );
  if (!pin || pin.placed || !pin.companyId || !isStudioCategory(pin.categories)) return false;
  const hq = await studioLocation(pin.companyId);
  if (!hq) return false;
  const rows = await db.query(
    `UPDATE "Pin" SET "location" = ST_SetSRID(ST_MakePoint($3, $2), 4326)::geography, "address" = $4
     WHERE "id" = $1 AND "location" IS NULL AND COALESCE("address", '') = '' RETURNING "id"`,
    [pinId, hq.latitude, hq.longitude, hq.address],
  );
  return rows.length > 0;
}
