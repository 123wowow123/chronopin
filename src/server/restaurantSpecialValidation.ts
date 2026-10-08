import { restaurantSourceKey, type RestaurantMenuProfile } from '@/lib/restaurantMenus';
import { RESTAURANT_REGIONS } from '@/lib/restaurants';
import { HttpError } from './util/httpError';

export type SpecialVenueProfile = RestaurantMenuProfile & { neighborhood?: string; address?: string; websiteUrl?: string };
export type SpecialVenueInput = { regionSlug: string | null; profile: SpecialVenueProfile; enabled: boolean };

function check(ok: unknown, message: string): asserts ok {
  if (!ok) throw new HttpError(400, message);
}
function object(value: unknown): asserts value is Record<string, any> {
  check(value && typeof value === 'object' && !Array.isArray(value), 'Expected an object');
}
function text(value: unknown) { return typeof value === 'string' && value.length <= 10000; }
function url(value: unknown) {
  if (!text(value)) return false;
  try { const u = new URL(value as string); return ['http:', 'https:'].includes(u.protocol) && !u.username && !u.password; } catch { return false; }
}
function date(value: unknown) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
function assetUrl(value: unknown) { return url(value) || (typeof value === 'string' && /^\/restaurant-images\/[a-zA-Z0-9/_-]+\.(?:webp|png|jpe?g)$/.test(value)); }
function list(value: unknown, max: number): asserts value is any[] { check(Array.isArray(value) && value.length <= max, `Expected an array of at most ${max} entries`); }
function optionalStrings(value: Record<string, any>, keys: string[]) {
  for (const key of keys) check(value[key] === undefined || text(value[key]), `Invalid ${key}`);
}

export function parseSpecialVenue(value: unknown): SpecialVenueInput {
  object(value);
  check(JSON.stringify(value).length <= 250000, 'Venue payload is too large');
  const { regionSlug = null, enabled = true, profile: p } = value;
  check(regionSlug === null || RESTAURANT_REGIONS.some((r) => r.slug === regionSlug), 'Unknown regionSlug');
  check(typeof enabled === 'boolean', 'enabled must be boolean');
  object(p);
  check(url(p.pinSourceUrl) && text(p.name) && p.name.trim() && date(p.checkedAt), 'Provide a source URL, name, and checkedAt date');
  optionalStrings(p, ['address', 'neighborhood']);
  check(p.websiteUrl === undefined || url(p.websiteUrl), 'Invalid websiteUrl');
  if (regionSlug !== null) check(p.address?.trim() && p.neighborhood?.trim() && url(p.websiteUrl), 'Regional venues require address, neighborhood, and websiteUrl');
  list(p.menus, 100);
  for (const menu of p.menus) {
    object(menu); check(text(menu.label) && url(menu.url), 'Invalid menu label or URL');
    check(menu.coverage === undefined || ['published', 'sample', 'link'].includes(menu.coverage), 'Invalid menu coverage');
    optionalStrings(menu, ['note']);
    check(menu.documentUrl === undefined || url(menu.documentUrl), 'Invalid documentUrl');
    if (menu.pages !== undefined) {
      list(menu.pages, 100);
      for (const page of menu.pages) { object(page); check(assetUrl(page.src) && Number.isFinite(page.width) && page.width > 0 && Number.isFinite(page.height) && page.height > 0 && (page.label === undefined || text(page.label)), 'Invalid menu page'); }
    }
    list(menu.items, 1000);
    for (const item of menu.items) { object(item); check(text(item.name) && item.name.trim(), 'Invalid menu item'); optionalStrings(item, ['category', 'note', 'priceLabel']); check(item.price === undefined || (Number.isFinite(item.price) && item.price >= 0), 'Invalid menu price'); }
  }
  list(p.specials, 50);
  for (const special of p.specials) {
    object(special);
    check(['lunch', 'other'].includes(special.kind) && text(special.title) && special.title.trim() && text(special.description) && url(special.sourceUrl), 'Invalid special');
    optionalStrings(special, ['schedule', 'menuLabel']);
    for (const key of ['conditions', 'excludedMenuItems']) if (special[key] !== undefined) { list(special[key], 100); check(special[key].every(text), `Invalid ${key}`); }
    check(special.discounted === undefined || typeof special.discounted === 'boolean', 'Invalid discounted flag');
    for (const key of ['validFrom', 'validThrough']) check(special[key] === undefined || date(special[key]), `Invalid ${key}`);
    check(!special.validFrom || !special.validThrough || special.validFrom <= special.validThrough, 'Validity dates are reversed');
    check(!special.menuLabel || p.menus.some((m: any) => m.label === special.menuLabel), 'menuLabel must identify a menu');
    if (special.availability !== undefined) {
      const a = special.availability; object(a); list(a.windows, 50); check(a.windows.length, 'Provide at least one service window');
      for (const w of a.windows) {
        object(w); list(w.days, 7);
        check(w.days.length && w.days.every((d: unknown) => Number.isInteger(d) && Number(d) >= 0 && Number(d) <= 6) && new Set(w.days).size === w.days.length, 'Invalid service weekdays');
        check([w.start, w.end].every((t) => typeof t === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(t)) && w.start !== w.end, 'Invalid service times');
      }
      check(a.excludesHolidays === undefined || typeof a.excludesHolidays === 'boolean', 'Invalid holiday flag');
      if (a.excludedDates !== undefined) { list(a.excludedDates, 1000); check(a.excludedDates.every(date), 'Invalid excludedDates'); }
    }
  }
  if (p.review !== undefined) { const r = p.review; object(r); check(Number.isFinite(r.score) && r.score >= 0 && r.score <= 5 && Number.isInteger(r.count) && r.count >= 0 && text(r.provider) && url(r.sourceUrl) && date(r.checkedAt), 'Invalid review evidence'); }
  if (p.photo !== undefined) { const photo = p.photo; object(photo); check(url(photo.src) && text(photo.alt) && photo.alt.trim() && text(photo.credit) && url(photo.sourceUrl) && url(photo.originalUrl) && date(photo.checkedAt), 'Invalid photo provenance'); }
  if (p.location !== undefined) { const l = p.location; object(l); check(Number.isFinite(l.latitude) && Math.abs(l.latitude) <= 90 && Number.isFinite(l.longitude) && Math.abs(l.longitude) <= 180 && url(l.sourceUrl) && date(l.checkedAt), 'Invalid location'); }
  if (p.lunchNote !== undefined) { object(p.lunchNote); check(text(p.lunchNote.text) && url(p.lunchNote.sourceUrl), 'Invalid lunch note'); }
  // Clone the validated JSON rather than preserving an input object's prototype.
  return { regionSlug, enabled, profile: JSON.parse(JSON.stringify(p)) as SpecialVenueProfile };
}

export function specialVenueSourceKey(input: SpecialVenueInput) { return restaurantSourceKey(input.profile.pinSourceUrl); }
export function specialVenueRevision(value: unknown): number {
  check(Number.isSafeInteger(value) && Number(value) > 0, 'Provide the current revision');
  return Number(value);
}
