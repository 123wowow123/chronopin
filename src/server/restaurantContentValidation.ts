import type { RestaurantMenuProfile } from '@/lib/restaurantMenus';
import { restaurantSourceKey } from '@/lib/restaurantMenus';
import type { RestaurantDetails } from '@/lib/restaurantDetails';
import { RESTAURANT_REGIONS } from '@/lib/restaurants';
import { parseSpecialVenue } from './restaurantSpecialValidation';
import { HttpError } from './util/httpError';

export type RestaurantTile = {
  regionSlug: string;
  kind: 'top' | 'opening';
  slug: string;
  name: string;
  neighborhood: string;
  cuisine: string;
  description: string;
  address: string;
  websiteUrl: string;
  checkedAt: string;
  recognition: string;
  priceRange: string;
  image: string | null;
  imageCredit: string;
  imageSourceUrl?: string;
  imageNote?: string | null;
  openingConfirmed?: boolean;
  day?: string;
};
export type RestaurantContentProfile = { pinSourceUrl: string; menu?: RestaurantMenuProfile; details?: RestaurantDetails; tile?: RestaurantTile };
export type RestaurantContentInput = { profile: RestaurantContentProfile; enabled: boolean };
function check(ok: unknown, message: string): asserts ok { if (!ok) throw new HttpError(400, message); }
function object(v: unknown): asserts v is Record<string, any> { check(v && typeof v === 'object' && !Array.isArray(v), 'Expected an object'); }
function text(v: unknown) { return typeof v === 'string' && v.length <= 10000; }
function url(v: unknown) { try { const u = new URL(v as string); return text(v) && ['http:', 'https:'].includes(u.protocol) && !u.username && !u.password; } catch { return false; } }
function date(v: unknown) { return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v; }
export function parseRestaurantContent(value: unknown): RestaurantContentInput {
  object(value); check(JSON.stringify(value).length <= 500000, 'Restaurant content payload is too large');
  const { profile: p, enabled = true } = value; object(p);
  check(typeof enabled === 'boolean' && url(p.pinSourceUrl), 'Provide enabled and a valid pinSourceUrl');
  check(p.menu !== undefined || p.details !== undefined || p.tile !== undefined, 'Provide a menu, details or tile');
  if (p.menu !== undefined) {
    parseSpecialVenue({ profile: p.menu });
    check(restaurantSourceKey(p.menu.pinSourceUrl) === restaurantSourceKey(p.pinSourceUrl), 'Menu must belong to the same branch source');
    for (const menu of p.menu.menus) if (menu.currency !== undefined) {
      check(typeof menu.currency === 'string' && /^[A-Z]{3}$/.test(menu.currency), 'Invalid menu currency');
      try { new Intl.NumberFormat('en', { style: 'currency', currency: menu.currency }).format(1); } catch { throw new HttpError(400, 'Invalid menu currency'); }
    }
  }
  if (p.details !== undefined) {
    const d = p.details; object(d);
    check(url(d.pinSourceUrl) && restaurantSourceKey(d.pinSourceUrl) === restaurantSourceKey(p.pinSourceUrl), 'Details must belong to the same branch source');
    check(text(d.name) && d.name.trim() && date(d.checkedAt), 'Invalid details name or checkedAt');
    check(d.websiteUrl === null || url(d.websiteUrl), 'Invalid websiteUrl');
    check(d.phone === null || text(d.phone), 'Invalid phone');
    check(Array.isArray(d.openingHours) && d.openingHours.length <= 100, 'Invalid openingHours');
    for (const h of d.openingHours) { object(h); check(text(h.days) && text(h.hours), 'Invalid opening hours'); }
    check(d.hoursNote === undefined || d.hoursNote === null || text(d.hoursNote), 'Invalid hoursNote');
    for (const key of ['detailsSourceUrl', 'reservationUrl']) check(d[key] === undefined || url(d[key]), `Invalid ${key}`);
    if (d.additionalSources !== undefined) {
      check(Array.isArray(d.additionalSources) && d.additionalSources.length <= 100, 'Invalid additionalSources');
      for (const s of d.additionalSources) { object(s); check(text(s.label) && url(s.url), 'Invalid detail source'); }
    }
  }
  if (p.tile !== undefined) {
    const t = p.tile; object(t);
    check(RESTAURANT_REGIONS.some((r) => r.slug === t.regionSlug), 'Unknown tile regionSlug');
    check(['top', 'opening'].includes(t.kind), 'Invalid tile kind');
    for (const key of ['slug', 'name', 'neighborhood', 'cuisine', 'description', 'address', 'recognition', 'priceRange', 'imageCredit']) check(text(t[key]), `Invalid tile ${key}`);
    check(t.slug.trim() && t.name.trim() && url(t.websiteUrl) && date(t.checkedAt), 'Provide tile slug, name, websiteUrl and checkedAt');
    check(t.priceRange === '' || /^\${1,4}$/.test(t.priceRange), 'Invalid priceRange');
    check(t.image === null || (url(t.image) && new URL(t.image).protocol === 'https:' && new URL(t.image).hostname === 'chronopin.blob.core.windows.net'), 'Tile photos must use verified Chronopin Azure Blob URLs');
    check(t.imageSourceUrl === undefined || url(t.imageSourceUrl), 'Invalid imageSourceUrl');
    if (t.image) check(t.imageCredit.trim() && url(t.imageSourceUrl), 'Photos require credit and imageSourceUrl');
    check(t.imageNote === undefined || t.imageNote === null || text(t.imageNote), 'Invalid imageNote');
    check(t.day === undefined || date(t.day), 'Invalid opening evidence day');
    check(t.openingConfirmed === undefined || typeof t.openingConfirmed === 'boolean', 'Invalid openingConfirmed');
    if (t.openingConfirmed) check(date(t.day), 'Confirmed opening evidence requires its original day');
  }
  return { profile: p as RestaurantContentProfile, enabled };
}
