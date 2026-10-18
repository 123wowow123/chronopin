// Turn the bundled seasonal-activity catalog into Pin rows. Inserts only what is missing;
// an existing pin with the same sourceUrl is linked, never rewritten. Used by the activities:seed CLI.
import catalog from '@/server/data/activities.json';
import photoManifest from '@/server/data/activityPhotos.json';
import { ACTIVITY_CATEGORY_LABELS, SEASON_LABELS, activityCity, localDay, windowEnd, windowStart, type ActivityCatalogItem } from '@/lib/activities';
import { activityProblems, activitySourceUrls } from '@/lib/activityCatalog';
import * as db from '../db';
import { SearchPin } from '../model';
import { HttpError } from '../util/httpError';

export const ACTIVITY_DESK = '@TravelDesk';

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export const activityCatalog = catalog as ActivityCatalogItem[];

export function activityPinTitle(item: ActivityCatalogItem): string {
  return `${item.name} — ${activityCity(item.citySlug)!.name} seasonal activity`;
}

const CATEGORY_TAGS: Record<string, string> = { festival: 'Festival', sports: 'Sports', arts: 'Art', food: 'Food' };

export type ActivityPhoto = { key: string; image: string; width: number; height: number; credit: string; sourceUrl: string; imageSourceUrl: string };
const photos = photoManifest as ActivityPhoto[];

export type ActivitySeedResult = { dryRun: boolean; pinsAdded: { id: number; title: string }[]; pinsLinked: number; photosAttached: number; problems: string[] };

export async function seedActivities(options: { cities?: string[]; dryRun?: boolean; now?: Date } = {}): Promise<ActivitySeedResult> {
  const { dryRun = false, now = new Date() } = options;
  const problems = activityCatalog.flatMap((item) => activityProblems(item).map((p) => `${item.citySlug}/${item.slug}: ${p}`));
  if (problems.length) return { dryRun, pinsAdded: [], pinsLinked: 0, photosAttached: 0, problems };
  const items = options.cities ? activityCatalog.filter((item) => options.cities!.includes(item.citySlug)) : activityCatalog;
  const urls = activitySourceUrls(activityCatalog);
  const keyOf = (item: ActivityCatalogItem) => urls.get(`${item.citySlug}/${item.slug}`)!;

  const [user] = await db.query<{ id: number }>('SELECT "id" FROM "User" WHERE "userName" = $1', [ACTIVITY_DESK]);
  if (!user) throw new HttpError(400, `The curator ${ACTIVITY_DESK} is required.`);
  const existing = new Set((await db.query<{ sourceUrl: string }>(
    `SELECT "sourceUrl" FROM "Pin" WHERE "sourceUrl" = ANY($1::text[]) AND "utcDeletedDateTime" IS NULL`, [items.map(keyOf)],
  )).map((row) => row.sourceUrl));
  const missing = items.filter((item) => !existing.has(keyOf(item)));
  if (dryRun) return { dryRun, pinsAdded: [], pinsLinked: items.length - missing.length, photosAttached: 0, problems: [] };

  return db.transaction(async (query) => {
    await query('SELECT pg_advisory_xact_lock(731907)');
    const pinsAdded: ActivitySeedResult['pinsAdded'] = [];
    for (const item of missing) {
      const city = activityCity(item.citySlug)!;
      const title = activityPinTitle(item);
      const today = localDay(now, city.timeZone);
      const start = windowStart(item, today);
      const end = windowEnd(item, start);
      const summary = `<p>${escapeHtml(item.description)}<cite data-ref="${escapeHtml(item.sourceUrl)}"></cite></p>`
        + `<p>${escapeHtml(item.venue)}, ${escapeHtml(item.neighborhood)}, ${escapeHtml(city.name)}.${item.costNote ? ` ${escapeHtml(item.costNote)}.` : ''}</p>`;
      const [company] = await query<{ id: number }>(`INSERT INTO "Company" ("name") VALUES ($1) ON CONFLICT ("name") DO UPDATE SET "name" = "Company"."name" RETURNING "id"`, [item.venue]);
      const [pin] = await query<{ id: number }>(
        `INSERT INTO "Pin" ("title", "description", "sourceUrl", "longFormSummary", "address", "location", "companyId", "productName", "dateConfidence", "dateConfidenceReasoning", "utcStartDateTime", "utcEndDateTime", "allDay", "userId")
         VALUES ($1, $2, $3, $4, $5, ST_SetSRID(ST_MakePoint($7, $6), 4326)::geography, $8, $9, $10, $11, $12, $13, true, $14) RETURNING "id"`,
        [title, item.description, keyOf(item), summary, item.address, item.latitude, item.longitude, company.id, item.name, item.dateConfidence, item.dateReasoning, `${start}T00:00:00Z`, end > start ? `${end}T00:00:00Z` : null, user.id],
      );
      const tags = [city.name, 'Seasonal Activities', 'Activities', ...item.seasons.map((s) => SEASON_LABELS[s]), ACTIVITY_CATEGORY_LABELS[item.category], item.neighborhood, 'Travel', ...(CATEGORY_TAGS[item.category] ? [CATEGORY_TAGS[item.category]!] : [])];
      const categories = new Set(['Travel', ...(CATEGORY_TAGS[item.category] ? [CATEGORY_TAGS[item.category]!] : [])]);
      await query(`INSERT INTO "PinTag" ("pinId", "name", "kind", "source") SELECT $1, name, CASE WHEN name = ANY($3::text[]) THEN 'category' ELSE 'topic' END, 'user' FROM unnest($2::citext[]) AS name`, [pin.id, [...new Set(tags)], [...categories]]);
      await query(`INSERT INTO "PinReference" ("pinId", "url", "title", "confidence", "reasoning") VALUES ($1, $2, $3, 85, $4)`, [pin.id, item.sourceUrl, `${item.name} official information`, item.dateReasoning]);
      pinsAdded.push({ id: pin.id, title });
    }
    // Attach each recorded photo to a pin that has no picture yet; existing editorial media is never replaced.
    let photosAttached = 0;
    for (const photo of photos) {
      const item = items.find((i) => `${i.citySlug}/${i.slug}` === photo.key);
      if (!item) continue;
      const [pin] = await query<{ id: number; media: number }>(
        `SELECT p.id, (SELECT count(*)::int FROM "PinMedium" WHERE "pinId" = p.id AND "utcDeletedDateTime" IS NULL) AS media FROM "Pin" p WHERE p."sourceUrl" = $1 AND p."utcDeletedDateTime" IS NULL LIMIT 1`, [keyOf(item)]);
      if (!pin || pin.media > 0) continue;
      const [medium] = await query<{ id: number }>(`INSERT INTO "Medium" ("type", "thumbName", "thumbWidth", "thumbHeight", "originalUrl", "originalWidth", "originalHeight", "authorName", "authorUrl") VALUES ('1', $1, $2, $3, $1, $2, $3, $4, $5) RETURNING "id"`, [photo.image, photo.width, photo.height, photo.credit, photo.sourceUrl]);
      await query(`INSERT INTO "PinMedium" ("pinId", "mediumId") VALUES ($1, $2)`, [pin.id, medium.id]);
      photosAttached++;
    }
    return { dryRun, pinsAdded, pinsLinked: items.length - missing.length, photosAttached, problems: [] };
  });
}

// Source URL of the pin backing an activity (what the landing page looks up).
export function activityPinSourceUrls(): Map<string, string> {
  return activitySourceUrls(activityCatalog);
}

// Add the catalog's pins to the search index (pins seeded by SQL never go through the pin API that indexes them).
// Upserts one at a time so the search service is never flooded; returns how many were indexed and any failures.
export async function indexActivityPins(): Promise<{ indexed: number; failed: number[] }> {
  const rows = await db.query<{ id: number; title: string; description: string | null }>(
    `SELECT "id", "title", "description" FROM "Pin" WHERE "sourceUrl" = ANY($1::text[]) AND "utcDeletedDateTime" IS NULL ORDER BY "id"`, [[...activityPinSourceUrls().values()]]);
  const failed: number[] = [];
  for (const row of rows) {
    try { await new SearchPin(row).save(); } catch { failed.push(row.id); }
  }
  return { indexed: rows.length - failed.length, failed };
}
