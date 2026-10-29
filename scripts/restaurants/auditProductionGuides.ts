// Read-only production sweep. Never logs tokens or writes application content.
import '../env';
import { mkdir, writeFile } from 'node:fs/promises';
import { RESTAURANT_REGIONS } from '@/lib/restaurants';
import { dayKeyIn } from '@/lib/format';
import { restaurantSourceKey } from '@/lib/restaurantMenus';
import { restaurantOfferSections } from '@/lib/restaurantOffers';
import { buildRestaurantOffers } from '@/server/services/restaurantOffers';

const base = process.env.GUIDE_AUDIT_URL || 'https://www.chronopin.com';
const output = process.env.GUIDE_AUDIT_OUTPUT || '.scrape/restaurant-global-sweep-2026-10-29';
await mkdir(output, { recursive: true });
const login = await fetch(base + '/auth/local', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD }) });
if (!login.ok) throw Error('Admin login failed: ' + login.status);
const { token } = await login.json();
async function get(path: string) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch(base + path, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(90000) });
      if (!r.ok) throw Error(path + ': ' + r.status);
      return await r.json();
    } catch (e) { if (attempt === 2) throw e; }
  }
}
async function rows(table: string, filters: Record<string, string> = {}) {
  const result: any[] = [];
  for (let offset = 0; ; offset += 1000) {
    const page = await get('/api/admin/db/' + table + '?' + new URLSearchParams({ ...filters, limit: '1000', offset: String(offset) }));
    result.push(...page.rows); if (result.length >= page.total) return result;
    if (!page.rows.length) throw Error('Empty database page: ' + table);
  }
}
const specials = (await get('/api/admin/restaurant-specials')).venues;
const content: any[] = [];
for (let offset = 0; ; offset += 1000) { const page = (await get('/api/admin/restaurant-content?limit=1000&offset=' + offset)).content; content.push(...page); if (page.length < 1000) break; }
const sources = [...new Set<string>([...specials, ...content].filter(v => v.enabled).map(v => v.profile.pinSourceUrl))];
const pins: any[] = [];
for (let i = 0; i < sources.length; i += 25) pins.push(...await rows('Pin', { 'sourceUrl.in': sources.slice(i, i + 25).flatMap(u => [u, u.replace(/^https:/, 'http:')]).join(','), 'utcDeletedDateTime.null': 'true' }));
const tags = await rows('PinTag', { 'name.in': 'Restaurant,Restaurants,Restaurant Opening,Top Restaurants,Restaurant Special' });
const seen = new Set(pins.map(p => p.id)); const ids = [...new Set<number>(tags.map(t => t.pinId))].filter(id => !seen.has(id));
for (let i = 0; i < ids.length; i += 100) pins.push(...await rows('Pin', { 'id.in': ids.slice(i, i + 100).join(','), 'utcDeletedDateTime.null': 'true' }));
await writeFile(output + '/snapshot.json', JSON.stringify({ base, at: new Date().toISOString(), specials, content, pins }, null, 2));
console.log(`Snapshot: ${RESTAURANT_REGIONS.length} cities, ${specials.length} offer profiles, ${content.length} content profiles, ${pins.length} pins`);
const sourceKey = (u: string) => u.trim().replace(/^https?:\/\//i, '');
const pinMap = new Map(pins.map(p => [sourceKey(p.sourceUrl || ''), p]));
const missing = [...specials.map((v: any) => ({ ...v, type: 'special' })), ...content.filter(v => v.profile.tile).map(v => ({ ...v, type: v.profile.tile.kind }))].filter(v => v.enabled && !pinMap.has(sourceKey(v.profile.pinSourceUrl))).map(v => ({ type: v.type, id: v.id, region: v.regionSlug || v.profile.tile?.regionSlug, name: v.profile.name || v.profile.tile?.name, sourceUrl: v.profile.pinSourceUrl, address: v.profile.address || v.profile.tile?.address, aliasCandidates: pins.filter(p => restaurantSourceKey(p.sourceUrl || '') === restaurantSourceKey(v.profile.pinSourceUrl)).map(p => ({ id: p.id, sourceUrl: p.sourceUrl, name: p.productName || p.title, address: p.address })), reason: 'No exact live source match; branch identity and opening evidence required before repair.' }));
const badDates = [...specials, ...content].filter(v => v.enabled).flatMap(v => { const p = pinMap.get(sourceKey(v.profile.pinSourceUrl)); return p && p.utcStartDateTime?.slice(0, 10) === (v.profile.checkedAt || v.profile.tile?.checkedAt) && /not (?:a |an |its |the )?opening date|verification date|snapshot|not.*restaurant.*opening|content verification/i.test(p.dateConfidenceReasoning || '') ? [{ id: p.id, name: p.productName || p.title, sourceUrl: p.sourceUrl, day: p.utcStartDateTime.slice(0, 10), savedReasoning: p.dateConfidenceReasoning, reason: 'Saved reasoning identifies a research or promotion snapshot instead of the branch opening; research the opening before correction.' }] : []; });
const report: any = { base, checkedAt: new Date().toISOString(), regions: [], missingPins: missing, suspiciousOpeningDates: [...new Map(badDates.map(x => [x.id, x])).values()], failures: [] };
await writeFile(output + '/audit.json', JSON.stringify(report, null, 2));
const now = new Date();
// Two cities at a time; each city's pages remain sequential and fully paginated.
for (let index = 0; index < RESTAURANT_REGIONS.length; index += 2) {
  const result = await Promise.allSettled(RESTAURANT_REGIONS.slice(index, index + 2).map(async region => {
    const sections: any[] = [];
    for (const [view, section] of [['upcoming', ''], ['new', ''], ['top', ''], ['discounts', 'available'], ['discounts', 'next']]) {
      const cards: any[] = []; let total = 0;
      for (let offset = 0; ; offset += 25) {
        const page = await get('/api/restaurants/guide?' + new URLSearchParams({ region: region.slug, view, section, offset: String(offset), sort: section === 'next' ? 'starts' : 'rating' }));
        total = page.total; cards.push(...page.items); if (cards.length >= total) break;
        if (!page.items.length) throw Error(`Empty guide page ${region.slug}/${view}/${section}/${offset}`);
      }
      const identity = (c: any) => c.restaurantHref || String(c.pinId || c.id);
      sections.push({ view, section, total, fetched: cards.length, duplicates: cards.length - new Set(cards.map(identity)).size, externalLinks: cards.filter(c => c.restaurantHref && !c.restaurantHref.startsWith('/pin/')).map(c => c.name), noPhotos: cards.filter(c => !(c.photo?.src || c.image)).map(c => c.name), cards });
    }
    const mapped = new Map<string, { id: number; title: string }>();
    for (const v of specials) { const p = pinMap.get(sourceKey(v.profile.pinSourceUrl)); if (p) mapped.set(v.profile.pinSourceUrl, p); }
    const expected = restaurantOfferSections(buildRestaurantOffers([], [], dayKeyIn(now, region.timeZone), region.slug, specials, mapped), now, region.timeZone, { sort: 'starts' });
    const actual = sections.filter(s => s.view === 'discounts');
    return { slug: region.slug, country: region.country, expectedRegionalSpecials: { available: expected.available.length, next: expected.upcoming.length }, truncation: actual.some(s => s.total < (s.section === 'next' ? expected.upcoming.length : expected.available.length)), sections };
  }));
  result.forEach((r, j) => { if (r.status === 'fulfilled') report.regions.push(r.value); else report.failures.push({ region: RESTAURANT_REGIONS[index + j].slug, error: String(r.reason) }); });
  await writeFile(output + '/audit.json', JSON.stringify(report, null, 2));
  console.log(`Audited ${Math.min(index + 2, RESTAURANT_REGIONS.length)}/${RESTAURANT_REGIONS.length} cities`);
}
console.log(JSON.stringify({ regions: report.regions.length, missingPins: missing.length, suspiciousOpeningDates: report.suspiciousOpeningDates.length, truncatedRegions: report.regions.filter((r: any) => r.truncation).map((r: any) => r.slug), failures: report.failures }));
if (report.failures.length) process.exitCode = 1;
