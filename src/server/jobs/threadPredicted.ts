// Finds predicted pins and candidate parent pins/threads they can join
// (src/lib/dailyJobs.ts, docs/okf/scraping/daily-jobs.md#threadpredicted).
// Read by the daily jobs' predicted_pins tool (./tools.ts) for the
// threadPredicted task.
//
// A predicted pin (market-predicted event, or carrying the 'Predicted' tag)
// often belongs to an existing thread: an ongoing model series, a spaceflight
// test campaign, an annual tournament, an election cycle, or a franchise.
// When an earlier pin in that story already exists, attaching the predicted
// pin via parentId keeps the story threaded.

import { CURATORS } from './curators';
import * as db from '../db';
import PinDuplicate from '../model/pinDuplicate';
import { findSeriesPin } from '../scrape/modelSeries';
import { descendantIds, prequelPinFor, setParent } from '../scrape/prequel';
import { invalidatePin } from '../services/cache';
import { rethreadAllDuplicateGroups, rethreadDuplicateGroup, type DuplicateRethreadSummary } from '../services/duplicateThread';
import log from '../util/log';

export { rethreadAllDuplicateGroups, rethreadDuplicateGroup };
export type { DuplicateRethreadSummary };

export type ThreadCandidate = {
  id: number;
  title: string;
  utcStartDateTime: string;
  reason: string;
};

export type PredictedPinForThreading = {
  id: number;
  title: string;
  utcStartDateTime: string;
  parentId: number | null;
  company: string | null;
  author: string | null;
  editable: boolean;
  candidates: ThreadCandidate[];
};

// Patterns for recurring subjects commonly predicted
const SUBJECT_PATTERNS = [
  { pattern: /claude\s+(opus|sonnet|haiku)/i, name: 'claude', words: ['claude'] },
  { pattern: /gemini\s+(flash-lite|flash|pro|ultra)/i, name: 'gemini', words: ['gemini'] },
  { pattern: /grok\s*(\d+)?/i, name: 'grok', words: ['grok'] },
  { pattern: /deepseek\s*.*(pro|flash|v\d+|r\d+)/i, name: 'deepseek', words: ['deepseek'] },
  { pattern: /starship/i, name: 'starship', words: ['starship'] },
  { pattern: /artemis|moon\s+landing|astronauts\s+on\s+the\s+moon/i, name: 'artemis', words: ['artemis'] },
  { pattern: /nba\s+finals/i, name: 'nba finals', words: ['nba', 'finals'] },
  { pattern: /stanley\s+cup/i, name: 'stanley cup', words: ['stanley', 'cup'] },
  { pattern: /james\s+bond/i, name: 'james bond', words: ['james', 'bond'] },
  { pattern: /bundestag/i, name: 'bundestag', words: ['bundestag'] },
  { pattern: /india.*general\s+election/i, name: 'india election', words: ['india', 'election'] },
];

export async function findThreadCandidates(pin: {
  id: number;
  title: string;
  utcStartDateTime: Date | string;
  company?: string | null;
  sourceUrl?: string | null;
  categories?: string[];
  ratings?: { source?: string | null; url?: string | null }[];
}): Promise<ThreadCandidate[]> {
  const exclude = await descendantIds(pin.id).catch(() => [] as number[]);
  const duplicates = await PinDuplicate.group(pin.id).catch(() => [] as number[]);
  const skip = new Set([pin.id, ...exclude, ...duplicates]);
  const candidates: ThreadCandidate[] = [];
  const seenIds = new Set<number>();

  const addCandidate = async (cand: { id: number; title: string; utcStartDateTime: string; reason: string }) => {
    // If the candidate belongs to a duplicate group, resolve it to the canonical pin
    const group = await PinDuplicate.group(cand.id).catch(() => [cand.id]);
    const canonicalId = group[0];
    if (skip.has(canonicalId) || seenIds.has(canonicalId)) return;

    if (canonicalId !== cand.id) {
      const [cRow] = await db.query<{ id: number; title: string; utcStartDateTime: Date }>(
        `SELECT id, title, "utcStartDateTime" FROM "Pin" WHERE id = $1 AND "utcDeletedDateTime" IS NULL`,
        [canonicalId],
      );
      if (cRow) {
        candidates.push({
          id: cRow.id,
          title: cRow.title,
          utcStartDateTime: new Date(cRow.utcStartDateTime).toISOString(),
          reason: cand.reason,
        });
        seenIds.add(cRow.id);
        return;
      }
    }

    candidates.push(cand);
    seenIds.add(cand.id);
  };

  // 1. Model series check (e.g. Claude Opus, Gemini Flash, Grok)
  const series = await findSeriesPin(pin, [...exclude, ...duplicates]).catch(() => undefined);
  if (series && !skip.has(series.id)) {
    await addCandidate({
      id: series.id,
      title: series.title,
      utcStartDateTime: new Date(series.utcStartDateTime).toISOString(),
      reason: 'AI model series',
    });
  }

  // 2. Anime prequel check (via MAL / AniList)
  const prequel = await prequelPinFor(pin).catch(() => undefined);
  if (prequel && !skip.has(prequel.id) && !seenIds.has(prequel.id)) {
    const [pRow] = await db.query<{ utcStartDateTime: Date }>(
      `SELECT "utcStartDateTime" FROM "Pin" WHERE id = $1`,
      [prequel.id],
    );
    await addCandidate({
      id: prequel.id,
      title: prequel.title,
      utcStartDateTime: pRow?.utcStartDateTime ? new Date(pRow.utcStartDateTime).toISOString() : new Date().toISOString(),
      reason: 'anime prequel',
    });
  }

  // 3. Known subject patterns
  for (const sp of SUBJECT_PATTERNS) {
    if (sp.pattern.test(pin.title)) {
      const params: any[] = [pin.id, pin.utcStartDateTime];
      const whereWords = sp.words.map((w) => {
        params.push(`%${w}%`);
        return `"title" ILIKE $${params.length}`;
      });
      const rows = await db.query<{ id: number; title: string; utcStartDateTime: Date }>(
        `SELECT id, title, "utcStartDateTime"
         FROM "Pin"
         WHERE "utcDeletedDateTime" IS NULL
           AND id != $1
           AND "utcStartDateTime" <= $2
           AND ${whereWords.join(' AND ')}
         ORDER BY "utcStartDateTime" DESC, id DESC
         LIMIT 5`,
        params,
      );
      for (const r of rows) {
        if (!skip.has(r.id) && !seenIds.has(r.id)) {
          await addCandidate({
            id: r.id,
            title: r.title,
            utcStartDateTime: new Date(r.utcStartDateTime).toISOString(),
            reason: `${sp.name} match`,
          });
        }
      }
    }
  }

  // 4. Distinctive title terms
  const terms = pin.title
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(
      (w) =>
        w.length > 4 &&
        !/^(will|expected|releases|release|announces|announce|names|crown|decides|picks|files|lands|dock|climbs|weigh|hold|before|through|next|again|from|their|about)$/i.test(
          w,
        ),
    );

  if (terms.length >= 2 && candidates.length < 5) {
    const params: any[] = [pin.id, pin.utcStartDateTime, `%${terms[0]}%`, `%${terms[1]}%`];
    const rows = await db.query<{ id: number; title: string; utcStartDateTime: Date }>(
      `SELECT id, title, "utcStartDateTime"
       FROM "Pin"
       WHERE "utcDeletedDateTime" IS NULL
         AND id != $1
         AND "utcStartDateTime" <= $2
         AND ("title" ILIKE $3 AND "title" ILIKE $4)
       ORDER BY "utcStartDateTime" DESC, id DESC
       LIMIT 3`,
      params,
    );
    for (const r of rows) {
      if (!skip.has(r.id) && !seenIds.has(r.id)) {
        await addCandidate({
          id: r.id,
          title: r.title,
          utcStartDateTime: new Date(r.utcStartDateTime).toISOString(),
          reason: `title match (${terms[0]}, ${terms[1]})`,
        });
      }
    }
  }

  return candidates.slice(0, 5);
}

export type PredictedPinsOptions = {
  unthreadedOnly?: boolean;
  limit?: number;
  exclude?: number[];
};

export async function predictedPins({
  unthreadedOnly = true,
  limit = 20,
  exclude = [],
}: PredictedPinsOptions = {}): Promise<{
  total: number;
  unthreaded: number;
  pins: PredictedPinForThreading[];
  duplicateRethreads: DuplicateRethreadSummary[];
}> {
  // Rethread any duplicate pins marked as same event so they do not show up on threads
  const duplicateRethreads = await rethreadAllDuplicateGroups({ apply: true }).catch((err) => {
    log.warn('Rethreading duplicate groups in predictedPins failed:', (err as Error).message);
    return [] as DuplicateRethreadSummary[];
  });

  const curators = Object.keys(CURATORS).map((h) => h.replace(/^@/, '').toLowerCase());
  const rows = await db.query<{
    id: number;
    title: string;
    utcStartDateTime: Date;
    parentId: number | null;
    company: string | null;
    author: string | null;
    editable: boolean;
    sourceUrl: string | null;
  }>(
    `SELECT p.id, p.title, p."utcStartDateTime", p."parentId",
       c.name AS company, u."userName" AS author,
       COALESCE(lower(ltrim(u."userName"::text, '@')) = ANY($1::text[]), false) AS "editable",
       p."sourceUrl"
     FROM "Pin" p
     LEFT JOIN "Company" c ON c.id = p."companyId"
     LEFT JOIN "User" u ON u.id = p."userId"
     WHERE p."utcDeletedDateTime" IS NULL
       AND NOT p.id = ANY($2::int[])
       AND (
         EXISTS (SELECT 1 FROM "PinTag" pt WHERE pt."pinId" = p.id AND lower(pt.name) = 'predicted')
         OR (p."dateConfidence" = 'estimated' AND (
           EXISTS (SELECT 1 FROM "PinReference" pr WHERE pr."pinId" = p.id AND pr.url ~* '(kalshi\\.com|polymarket\\.(com|us))/')
           OR p."sourceUrl" ~* '(kalshi\\.com|polymarket\\.(com|us))/'
         ))
       )
       ${unthreadedOnly ? 'AND p."parentId" IS NULL' : ''}
     ORDER BY "editable" DESC, (p."parentId" IS NULL) DESC, p.id DESC
     LIMIT $3`,
    [curators, exclude, Math.min(limit, 50)],
  );

  const [countRow] = await db.query<{ total: number; unthreaded: number }>(
    `SELECT
       count(*)::int AS total,
       count(*) FILTER (WHERE p."parentId" IS NULL)::int AS unthreaded
     FROM "Pin" p
     WHERE p."utcDeletedDateTime" IS NULL
       AND (
         EXISTS (SELECT 1 FROM "PinTag" pt WHERE pt."pinId" = p.id AND lower(pt.name) = 'predicted')
         OR (p."dateConfidence" = 'estimated' AND (
           EXISTS (SELECT 1 FROM "PinReference" pr WHERE pr."pinId" = p.id AND pr.url ~* '(kalshi\\.com|polymarket\\.(com|us))/')
           OR p."sourceUrl" ~* '(kalshi\\.com|polymarket\\.(com|us))/'
         ))
       )`,
  );

  const pins: PredictedPinForThreading[] = [];
  for (const row of rows) {
    const candidates = await findThreadCandidates(row);
    pins.push({
      id: row.id,
      title: row.title,
      utcStartDateTime: new Date(row.utcStartDateTime).toISOString(),
      parentId: row.parentId,
      company: row.company,
      author: row.author,
      editable: row.editable,
      candidates,
    });
  }

  return {
    total: countRow?.total ?? 0,
    unthreaded: countRow?.unthreaded ?? 0,
    pins,
    duplicateRethreads,
  };
}

// Applies thread parent directly to a pin (for scripts/threads/predicted.ts)
export async function applyThreadParent(pinId: number, parentId: number): Promise<void> {
  await setParent(pinId, parentId);
  invalidatePin(pinId);
  invalidatePin(parentId);
}
