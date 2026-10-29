// Publish missing native pins only from reviewed branch-opening evidence.
// Read-only by default. Content APIs take effect without a deployment.
import '../env';
import { parseArgs } from 'node:util';
import { readFile, writeFile } from 'node:fs/promises';
import { verifyImportPhoto } from './importPhotos';
import { productionWrite } from '@/server/jobs/productionWrites';

type Opening = { day: string; precision: string; dateConfidence: 'confirmed' | 'estimated'; reason: string; sourceUrl: string; sourceTitle: string; quote: string; openedAt: string };
type Entry = { specialSourceUrl: string; name: string; opening: Opening };
const { values } = parseArgs({ options: {
  file: { type: 'string', default: 'docs/restaurant-san-diego-specials-repair-2026-10-29.json' },
  url: { type: 'string', default: 'http://localhost:3000' },
  apply: { type: 'boolean', default: false },
  report: { type: 'string' },
} });
const origin = new URL(values.url!);
const local = ['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname);
if (origin.username || origin.password || (origin.protocol !== 'https:' && !(local && origin.protocol === 'http:'))) throw new Error('Use HTTPS remotely; credentials belong in CHRONOPIN_ADMIN_TOKEN');
const token = process.env.CHRONOPIN_ADMIN_TOKEN;
if (!token) throw new Error('Set CHRONOPIN_ADMIN_TOKEN to an existing admin token');
async function api(path: string, method = 'GET', body?: unknown): Promise<any> {
  const run = async () => {
    const response = await fetch(new URL(path, origin), { method, redirect: 'error', signal: AbortSignal.timeout(120_000), headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
    if (!response.ok) throw new Error(`${method} ${path}: ${response.status} ${(await response.text()).slice(0,300)}`);
    return response.json();
  };
  return method === 'GET' || local ? run() : productionWrite(run);
}
const data = JSON.parse(await readFile(values.file!, 'utf8')) as { regionSlug: string; entries: Entry[] };
const escape = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const key = (url: string) => url.trim().replace(/^https?:\/\//i, '');
const venues = (await api(`/api/admin/restaurant-specials?region=${encodeURIComponent(data.regionSlug)}`)).venues;
const plans: { entry: Entry; venue: any; existing?: any; photo?: Awaited<ReturnType<typeof verifyImportPhoto>> }[] = [];
const seen = new Set<string>();
for (const entry of data.entries) {
  const o = entry.opening;
  if (seen.has(key(entry.specialSourceUrl))) throw new Error(`Repeated source: ${entry.name}`);
  seen.add(key(entry.specialSourceUrl));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(o.day) || Number.isNaN(Date.parse(o.day)) || !o.openedAt || !o.quote.trim() || !o.reason.trim() || !o.sourceTitle || !o.sourceUrl.startsWith('https://')) throw new Error(`Missing reviewed opening evidence: ${entry.name}`);
  if (o.precision !== 'day' && o.dateConfidence !== 'estimated') throw new Error(`Approximate date must be estimated: ${entry.name}`);
  const venue = venues.find((v: any) => key(v.profile.pinSourceUrl) === key(entry.specialSourceUrl));
  if (!venue?.enabled) throw new Error(`Venue missing or disabled: ${entry.name}`);
  const variants = [entry.specialSourceUrl, entry.specialSourceUrl.replace(/^https:/, 'http:')];
  const found = (await api(`/api/admin/db/Pin?${new URLSearchParams({ 'sourceUrl.in': variants.join(','), limit: '10' })}`)).rows;
  if (found.some((p: any) => p.utcDeletedDateTime) || found.length > 1) throw new Error(`Archived or ambiguous pin: ${entry.name}`);
  plans.push({ entry, venue, existing: found[0] });
}
// Check every referenced public image before starting any publication writes.
for (const plan of plans) {
  const p = plan.venue.profile;
  if (p.photo) plan.photo = await verifyImportPhoto({ url: p.photo.src, credit: p.photo.credit, note: p.photo.alt ?? '', sourcePage: p.photo.sourceUrl });
}
console.log(`Reviewed ${plans.length} branches; ${plans.filter((p) => !p.existing).length} missing pins; ${plans.filter((p) => p.photo).length} verified Azure photos`);
if (!values.apply) {
  console.log('Dry run only. Use --apply to publish the reviewed pins.');
} else {
  const results: { name: string; sourceUrl: string; id: number; created: boolean }[] = [];
  for (const { entry, venue, existing } of plans) {
    let pin = existing;
    const p = venue.profile; const o = entry.opening;
    // Refuse to publish against content that changed after preflight.
    const fresh = await api(`/api/admin/restaurant-specials/${venue.id}`);
    if (fresh.revision !== venue.revision || !fresh.enabled || fresh.profile.pinSourceUrl !== p.pinSourceUrl) throw new Error(`Venue changed during publication: ${entry.name}`);
    if (!pin) {
      const references = [
        { url: o.sourceUrl, title: o.sourceTitle, confidence: 90, reasoning: `${o.reason} Source excerpt: “${o.quote}”` },
        ...[...new Set([p.websiteUrl, ...p.specials.map((s: any) => s.sourceUrl)].filter(Boolean))].filter((url) => url !== o.sourceUrl).map((url) => ({ url, title: `${p.name}: published venue information and specials`, confidence: 90, reasoning: `Preserved branch-specific specials research, checked ${p.checkedAt}.` })),
      ];
      const openingText = `${p.name}: ${o.reason} Source excerpt: “${o.quote}”`;
      const body = {
        userName: '@FoodDesk', parentId: null, title: `${p.name} — San Diego restaurant guide`, productName: p.name,
        description: `${p.name} in ${p.neighborhood}. Published specials, menus and service conditions are shown in the restaurant details.`,
        sourceUrl: entry.specialSourceUrl, address: p.address, latitude: p.location?.latitude, longitude: p.location?.longitude,
        utcStartDateTime: `${o.day}T00:00:00Z`, allDay: true, dateConfidence: o.dateConfidence, dateConfidenceReasoning: o.reason,
        company: p.name, categories: ['Food'], tags: ['Restaurant', 'San Diego', p.neighborhood],
        references, ratings: p.review ? [{ source: p.review.provider, score: p.review.score, scoreMax: 5, url: p.review.sourceUrl }] : [],
        longFormSummary: `<p>${escape(p.name)} is at ${escape(p.address)}.</p><p>${escape(o.reason)}<cite data-ref="${escape(o.sourceUrl)}"></cite></p><p>Published offers follow the restaurant’s local service windows and conditions. Menu verification: ${escape(p.checkedAt)}.</p>`,
        sourceWikis: [{ url: o.sourceUrl, title: o.sourceTitle, text: openingText, generatedBy: 'codex/session', wiki: { title: o.sourceTitle, summary: `${p.name}: sourced branch opening history.`, body: openingText, tags: ['Restaurant', 'San Diego'] } }],
      };
      const response = await api('/api/admin/db/Pin', 'POST', body);
      const result = response.results?.[0];
      if (!result?.id) throw new Error(`Pin creation failed: ${entry.name}: ${JSON.stringify(response)}`);
      pin = { id: result.id };
    }
    const stored = (await api(`/api/admin/db/Pin?id=${pin.id}`)).rows[0];
    if (!stored || key(stored.sourceUrl) !== key(entry.specialSourceUrl) || stored.utcStartDateTime.slice(0,10) !== o.day || stored.dateConfidence !== o.dateConfidence || (existing && stored.userId !== existing.userId)) throw new Error(`Pin readback differs: ${entry.name}`);
    results.push({ name: entry.name, sourceUrl: entry.specialSourceUrl, id: pin.id, created: !existing });
    if (values.report) await writeFile(values.report, JSON.stringify({ base: origin.origin, pins: results }, null, 2) + '\n');
    console.log(`${existing ? 'Kept' : 'Created'} pin ${pin.id}: ${entry.name}`);
  }
  // Attach the already verified images with their measured dimensions and credits.
  // Raw media writes preserve the public blob rather than making redundant thumbnails.
  for (const [index, plan] of plans.entries()) {
    const photo = plan.photo; if (!photo) continue;
    const pin = results.find((r) => r.sourceUrl === plan.entry.specialSourceUrl)!;
    let medium = (await api(`/api/admin/db/Medium?${new URLSearchParams({ thumbName: photo.url, limit: '1000' })}`)).rows[0];
    const links = (await api(`/api/admin/db/PinMedium?pinId=${pin.id}&utcDeletedDateTime.null=true&limit=1000`)).rows;
    if (medium && links.some((l: any) => l.mediumId === medium.id)) continue;
    if (!medium) medium = (await api('/api/admin/db/Medium', 'POST', { type: '1', thumbName: photo.url, originalUrl: photo.url, thumbWidth: photo.width, thumbHeight: photo.height, originalWidth: photo.width, originalHeight: photo.height, authorName: `${photo.credit} · ${photo.note}`, authorUrl: photo.sourcePage })).rows[0];
    if (!links.some((l: any) => l.mediumId === medium.id)) await api('/api/admin/db/PinMedium', 'POST', { pinId: pin.id, mediumId: medium.id });
    const saved = (await api(`/api/admin/db/PinMedium?pinId=${pin.id}&mediumId=${medium.id}&utcDeletedDateTime.null=true`)).rows;
    if (saved.length !== 1) throw new Error(`Photo link readback failed: ${pin.name}`);
    if ((index + 1) % 10 === 0) console.log(`Verified pin-detail photos: ${index + 1}/${plans.length}`);
  }
  // Pin writes use stale-while-revalidate for timeline lists. Re-save an unchanged
  // offer status through its management API to expire the guide immediately.
  const last = plans.at(-1);
  if (last) {
    const fresh = await api(`/api/admin/restaurant-specials/${last.venue.id}`);
    if (!fresh.enabled) throw new Error('Last venue was disabled during publication');
    const saved = await api(`/api/admin/restaurant-specials/${fresh.id}`, 'PATCH', { enabled: true, revision: fresh.revision });
    const back = await api(`/api/admin/restaurant-specials/${fresh.id}`);
    if (back.revision !== saved.revision || !back.enabled) throw new Error('Guide refresh readback failed');
  }
  if (values.report) await writeFile(values.report, JSON.stringify({ base: origin.origin, pins: results, mediaVerified: true }, null, 2) + '\n');
  console.log(`Verified ${results.length} native pins and their saved photos.`);
}
