// Import reviewed research through the management APIs. Existing API edits are preserved.
// Default is a read-only dry run. This script never deploys application code.
import '../env';
import { parseArgs } from 'node:util';
import { readFile } from 'node:fs/promises';
import { resolveImportPhotos, verifyImportPhoto, type ImportPhoto } from './importPhotos';
import { parseRestaurantContent } from '@/server/restaurantContentValidation';
import { parseSpecialVenue } from '@/server/restaurantSpecialValidation';
import { productionWrite } from '@/server/jobs/productionWrites';

const { values } = parseArgs({ options: {
  file: { type: 'string', default: 'docs/restaurant-china-guides.json' },
  url: { type: 'string', default: 'http://localhost:3000' },
  apply: { type: 'boolean', default: false },
} });
const origin = new URL(values.url!);
const local = ['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname);
if (origin.username || origin.password || (origin.protocol !== 'https:' && !(origin.protocol === 'http:' && local))) throw new Error('Use HTTPS remotely; provide credentials only through CHRONOPIN_ADMIN_TOKEN');
const token = process.env.CHRONOPIN_ADMIN_TOKEN;
if (!token) throw new Error('Set CHRONOPIN_ADMIN_TOKEN to an existing admin bearer token');
const api = async (path: string, method = 'GET', body?: unknown): Promise<any> => {
  const run = async () => {
    const response = await fetch(new URL(path, origin), { method, redirect: 'error', signal: AbortSignal.timeout(60_000), headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
    if (!response.ok) throw new Error(`Management API ${method} ${path}: ${response.status}`);
    return response.json();
  };
  return method === 'GET' || local ? run() : productionWrite(run);
};
type Photo = ImportPhoto;
type Entry = { pin: Record<string, any>; content: unknown; special?: unknown; photos?: Photo[] };
const data = JSON.parse(await readFile(values.file!, 'utf8')) as { entries: Entry[] };
if (!Array.isArray(data.entries) || !data.entries.length) throw new Error('Expected reviewed entries');
for (const { pin } of data.entries) {
  if (/pin date is (?:research|guide)|is the guide verification date, not (?:its|an) opening date/i.test(String(pin.dateConfidenceReasoning ?? ''))) {
    throw new Error(`Restaurant pin needs its branch opening date, not a research date: ${pin.title}`);
  }
}
// Reject unsupported cities before creating any pin on an older deployment.
for (const region of new Set(data.entries.map((entry) => parseRestaurantContent(entry.content).profile.tile?.regionSlug).filter(Boolean))) {
  await api(`/api/restaurants/guide?region=${encodeURIComponent(region!)}&view=top`);
}
const plans = [];
const savedSpecials = (await api('/api/admin/restaurant-specials')).venues;
for (const entry of data.entries) {
  const content = parseRestaurantContent(entry.content);
  const incomingSpecial = entry.special ? parseSpecialVenue(entry.special) : undefined;
  if (incomingSpecial && incomingSpecial.profile.pinSourceUrl !== entry.pin.sourceUrl) throw new Error('Pin/special branch mismatch');
  if (content.profile.pinSourceUrl !== entry.pin.sourceUrl) throw new Error('Pin/content branch mismatch');
  const pin = (await api(`/api/admin/db/Pin?sourceUrl=${encodeURIComponent(entry.pin.sourceUrl)}&limit=2`)).rows[0];
  if (pin?.utcDeletedDateTime) throw new Error('An archived pin already uses this source; review it manually');
  const previous = (await api(`/api/admin/restaurant-content?sourceUrl=${encodeURIComponent(entry.pin.sourceUrl)}`)).content[0];
  const special = savedSpecials.find((venue: any) => venue.profile.pinSourceUrl === entry.pin.sourceUrl);
  const photos = resolveImportPhotos(entry.pin.sourceUrl, entry.photos ?? [], previous ?? content, special ?? incomingSpecial);
  plans.push({ entry, pin, previous, photos, specialExists: !!special });
  console.log(`${entry.pin.title}: ${pin ? `keep pin ${pin.id}` : 'create pin'}, ${previous ? 'preserve content' : 'create content'}, ${photos.length} reviewed photos`);
}
if (values.apply) {
  // Verify every public photo before any pin or live reference is written.
  const verified = new Map<string, Required<Photo>>();
  for (const photo of plans.flatMap((plan) => plan.photos)) {
    const result = await verifyImportPhoto(photo);
    verified.set(photo.url, result);
  }
  for (const plan of plans) {
    const { entry } = plan;
    let pin = plan.pin;
    if (!pin) {
      const result = (await api('/api/admin/db/Pin', 'POST', entry.pin)).results[0];
      if (result.error) throw new Error(`Pin save failed: ${result.error}`);
      pin = { id: result.id };
    }
    if (!plan.previous) await api('/api/admin/restaurant-content', 'POST', entry.content);
    if (entry.special && !plan.specialExists) await api('/api/admin/restaurant-specials', 'POST', entry.special);
    const links = (await api(`/api/admin/db/PinMedium?pinId=${pin.id}&utcDeletedDateTime.null=true&limit=1000`)).rows;
    for (const candidate of plan.photos) {
      const photo = { ...verified.get(candidate.url)!, credit: candidate.credit, note: candidate.note, sourcePage: candidate.sourcePage };
      let medium = (await api(`/api/admin/db/Medium?thumbName=${encodeURIComponent(photo.url)}`)).rows[0];
      if (!medium) medium = (await api('/api/admin/db/Medium', 'POST', { type: '1', thumbName: photo.url, originalUrl: photo.url, thumbWidth: photo.width, thumbHeight: photo.height, originalWidth: photo.width, originalHeight: photo.height, authorName: `${photo.credit} · ${photo.note}`, authorUrl: photo.sourcePage })).rows[0];
      if (!links.some((link: any) => link.mediumId === medium.id)) await api('/api/admin/db/PinMedium', 'POST', { pinId: pin.id, mediumId: medium.id });
    }
    console.log(`Saved /pin/${pin.id}`);
  }
} else console.log('Dry run only. Use --apply to save reviewed missing records through the APIs.');
