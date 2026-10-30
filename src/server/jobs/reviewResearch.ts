import * as db from '../db';
import { REVIEW_TABLES, reviewsProblem, type PinReview, type ReviewTable } from '@/lib/pinReviews';
import { adminDbRequest, prodBase, reviewResearchRequest } from './pinApi';
import { reviewPublicationDay } from '@/lib/reviewPublicationDay';
import { REVIEW_SENTIMENT_PROMPT } from '../extract/reviewSentiment';

export const REVIEW_ENDPOINTS: Record<ReviewTable, string> = {
  PinTaste: 'taste', PinCarPerf: 'car-performance', PinGasCarPerf: 'gas-car-performance',
  PinAircraftPerf: 'aircraft-performance', PinLlmPerf: 'llm-performance', PinVideoPerf: 'video-performance',
  PinHotel: 'hotel', PinDining: 'dining', PinCriticReview: 'critic-reviews',
};

// Merges evidence by URL without losing independent reviews already saved.
// A changed extract must arrive with its own score, never inherit the old one.
export function mergeResearchedReviews(existing: PinReview[], incoming: PinReview[], max: number): PinReview[] {
  const merged = new Map(existing.map((r) => [r.url, r]));
  for (const review of incoming) {
    const old = merged.get(review.url);
    merged.set(review.url, { ...review, publishedDate: review.publishedDate ?? old?.publishedDate ?? null });
  }
  if (merged.size > max) throw new Error(`Merged reviews exceed ${max}; review the existing sources before replacing any.`);
  return [...merged.values()];
}

// This is a research queue, not proof of eligibility: a category also contains
// awards, finances, concerts and construction, which the researcher must skip.
export async function reviewResearchGaps(limit = 5, skip: number[] = []) {
  const rubric = [];
  for (const table of REVIEW_TABLES) {
    const rows = await db.query<{ pinId: number; title: string; sourceUrl: string | null; reviews: PinReview[]; source: string }>(
      `SELECT t."pinId", p."title", p."sourceUrl", t."reviews", t."source" FROM "${table}" t JOIN "Pin" p ON p."id" = t."pinId"
       WHERE p."utcDeletedDateTime" IS NULL AND NOT (p."id" = ANY($1::int[])) AND t."source" <> 'hand'
       AND (jsonb_array_length(t."reviews") < $2 OR EXISTS (SELECT 1 FROM jsonb_array_elements(t."reviews") r WHERE r->>'publishedDate' IS NULL AND r->>'quote' IS NOT NULL AND r->>'url' NOT ILIKE '%guide.michelin.com%'))
       ORDER BY t."checkedAt" ASC, t."pinId" LIMIT $3`, [skip, table === 'PinTaste' ? 1 : 3, limit + 1],
    );
    rubric.push(...rows.map((row) => ({ table, ...row })));
  }
  const critics = await db.query(
    `SELECT p."id" AS "pinId", p."title", p."sourceUrl" FROM "Pin" p
     WHERE p."utcDeletedDateTime" IS NULL AND p."utcStartDateTime" <= now() AND NOT (p."id" = ANY($1::int[]))
       AND EXISTS (SELECT 1 FROM "PinTag" t WHERE t."pinId" = p."id" AND t."name" IN ('Gaming','Movie','TV','Music','Computing','Fashion'))
       AND NOT EXISTS (SELECT 1 FROM "PinCriticReview" c WHERE c."pinId" = p."id")
     ORDER BY p."utcStartDateTime" DESC, p."id" LIMIT $2`, [skip, limit + 1],
  );
  const construction = await constructionReviewGaps(limit, skip);
  return { reviewRubric: REVIEW_SENTIMENT_PROMPT, rubric: rubric.slice(0, limit), critics: critics.slice(0, limit), construction, moreRubrics: rubric.length > limit, moreCritics: critics.length > limit };
}

// The year of a project's stated completion ("Early 2028", "2031", "Q3 2027"), from the
// profile milestone labelled completion, delivery or opening; null when there is none.
export function completionYear(milestones: { label?: string; date?: string }[] | null): number | null {
  for (const m of milestones ?? []) {
    if (!/complet|deliver|open/i.test(m.label ?? '')) continue;
    const year = /\b(20\d\d)\b/.exec(m.date ?? '');
    if (year) return Number(year[1]);
  }
  return null;
}

// Development pins (tagged In Progress or Completed, with a buildout profile) that are nearing
// completion (stated completion near the current year, before or after) or have fewer than three
// critic reviews: leads for reaction excerpts from local news, saved to PinCriticReview.
// Nearest the current year first; a project with no stated year follows.
// Years from now to a project's stated completion; a project with no stated year comes last.
const distance = (completion: number | null, year: number) => (completion == null ? 999 : Math.abs(completion - year));

export async function constructionReviewGaps(limit: number, skip: number[]) {
  const rows = await db.query<{ pinId: number; title: string; sourceUrl: string | null; milestones: { label?: string; date?: string }[] | null; reviews: number }>(
    `SELECT p."id" AS "pinId", p."title", p."sourceUrl", f."profile"->'milestones' AS "milestones", COALESCE(jsonb_array_length(c."reviews"), 0) AS "reviews"
     FROM "Pin" p JOIN "PinFactory" f ON f."pinId" = p."id" LEFT JOIN "PinCriticReview" c ON c."pinId" = p."id"
     WHERE p."utcDeletedDateTime" IS NULL AND NOT (p."id" = ANY($1::int[])) AND COALESCE(c."source", '') <> 'hand'
       AND COALESCE(jsonb_array_length(c."reviews"), 0) < 3
       AND EXISTS (SELECT 1 FROM "PinTag" t WHERE t."pinId" = p."id" AND t."name" IN ('In Progress', 'Completed'))`, [skip],
  );
  const year = new Date().getFullYear();
  return rows
    .map(({ milestones, ...row }) => ({ ...row, completionYear: completionYear(milestones) }))
    .sort((a, b) => distance(a.completionYear, year) - distance(b.completionYear, year) || a.pinId - b.pinId)
    .slice(0, limit);
}

// Both sides are read, merged and verified through native APIs; no rubric
// axes, author or unrelated reviews are replaced from a research snapshot.
export async function saveResearchedReviews(table: ReviewTable, pinId: number, input: unknown, basis: string) {
  if (!(REVIEW_TABLES as readonly string[]).includes(table)) throw new Error('Unknown review table');
  const max = table === 'PinCriticReview' ? 8 : 6;
  const incoming = reviewsProblem(input, { max, maxQuote: 300 });
  if (typeof incoming === 'string') throw new Error(incoming);
  if (!incoming.length || incoming.some((r) => !r.url.startsWith('https://') || !r.title || !r.quote || r.sentiment == null)) throw new Error('Research needs opened HTTPS sources, exact titles, verbatim quotes and sentiment scores.');
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
  if (incoming.some((r) => r.publishedDate && reviewPublicationDay([r.publishedDate], today) !== r.publishedDate)) throw new Error('Publication dates must be real, nonfuture days; leave placeholders null.');
  if (!basis.trim() || basis.length > 1000) throw new Error('A research basis of 1–1000 characters is required');
  const [pin] = await db.query<{ title: string; sourceUrl: string | null }>(`SELECT "title", "sourceUrl" FROM "Pin" WHERE "id" = $1 AND "utcDeletedDateTime" IS NULL`, [pinId]);
  if (!pin) throw new Error('Pin not found');
  let remoteId: number | undefined;
  if (prodBase()) {
    if (!pin.sourceUrl) throw new Error('Cannot match production without a sourceUrl');
    const found = await adminDbRequest<{ rows: { id: number }[] }>('GET', `/api/admin/db/Pin?sourceUrl=${encodeURIComponent(pin.sourceUrl)}&utcDeletedDateTime.null=true&limit=2`);
    if (found.rows?.length !== 1) throw new Error('Production sourceUrl is missing or ambiguous');
    remoteId = found.rows[0].id;
  }
  const targets = [{ id: pinId, production: false }, ...(remoteId == null ? [] : [{ id: remoteId, production: true }])];
  const prepared = [];
  // Preflight both environments before changing either, including hand rows.
  for (const target of targets) {
    const route = `/api/pins/${target.id}/${REVIEW_ENDPOINTS[table]}`;
    const row = await reviewResearchRequest<Record<string, any> | null>('GET', route, undefined, target.production);
    if (row?.source === 'hand') throw new Error('Reviews set by hand are preserved');
    if (!row && table !== 'PinCriticReview') throw new Error(`Missing ${table} rubric`);
    const reviews = mergeResearchedReviews(row?.reviews ?? [], incoming, max);
    prepared.push({ ...target, route, body: { ...row, reviews, source: row?.source ?? 'session', basis: row?.basis ?? basis } });
  }
  const saved = [];
  for (const target of prepared) {
    await reviewResearchRequest('PUT', target.route, target.body, target.production);
    const verified = await reviewResearchRequest<{ reviews: PinReview[] }>('GET', target.route, undefined, target.production);
    for (const review of incoming) {
      const actual = verified.reviews.find((r) => r.url === review.url);
      if (!actual || actual.quote !== review.quote || actual.title !== review.title || actual.sentiment !== review.sentiment || (review.publishedDate && actual.publishedDate !== review.publishedDate)) throw new Error(`Saved review failed verification: ${target.route} ${review.url}`);
    }
    saved.push({ pinId: target.id, production: target.production, reviews: verified.reviews.length });
  }
  return { table, title: pin.title, saved };
}
