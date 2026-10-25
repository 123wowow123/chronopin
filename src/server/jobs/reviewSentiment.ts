// The scraped rubric reviews with no sentiment yet, handed to the jobs'
// sentiment task (pending_sentiment in ./tools.ts) and saved back by
// record_sentiment, so a review the rubric tasks or a desk batch just stored is
// on its pin's sentiment graph by the end of the run
// (src/components/pin/PinReviewSentiment.tsx).
//
// Only a review with a quote and a publication day: the graph plots it at that
// day, and with no quote there is nothing to read.

import * as db from '../db';
import { REVIEW_TABLES, type PinReview, type ReviewTable } from '@/lib/pinReviews';
import { REVIEW_SENTIMENT_PROMPT } from '../extract/reviewSentiment';
import { pushReviewSentiment } from './pinApi';

export { REVIEW_SENTIMENT_PROMPT };

export type PendingReview = { table: ReviewTable; pinId: number; pin: string; url: string; title: string | null; publishedDate: string; quote: string };

// Up to `limit` unscored reviews, newest rubric rows first, and how many more wait.
export async function pendingReviewSentiment(limit: number): Promise<{ reviews: PendingReview[]; remaining: number }> {
  const all: PendingReview[] = [];
  for (const table of REVIEW_TABLES) {
    const rows = await db.query<{ pinId: number; title: string; reviews: PinReview[] }>(
      `SELECT t."pinId", p."title", t."reviews" FROM "${table}" t JOIN "Pin" p ON p."id" = t."pinId"
       WHERE p."utcDeletedDateTime" IS NULL AND EXISTS (SELECT 1 FROM jsonb_array_elements(t."reviews") r WHERE r->>'sentiment' IS NULL AND r->>'quote' IS NOT NULL AND r->>'publishedDate' IS NOT NULL)
       ORDER BY t."checkedAt" DESC`,
    );
    for (const row of rows)
      for (const r of row.reviews)
        if (r.sentiment == null && r.quote && r.publishedDate) all.push({ table, pinId: row.pinId, pin: row.title, url: r.url, title: r.title, publishedDate: r.publishedDate, quote: r.quote });
  }
  return { reviews: all.slice(0, limit), remaining: Math.max(0, all.length - limit) };
}

// Saves scores handed back as { table, pinId, url, sentiment }: on a review that
// is still unscored, locally and then on production when the run writes there.
// Resolves how many were saved and how many skipped (an unknown table, pin or
// url, or a review scored since).
export async function saveReviewSentiments(items: unknown[]): Promise<{ saved: number; skipped: number }> {
  const byRow = new Map<string, { table: ReviewTable; pinId: number; scores: { url: string; sentiment: number }[] }>();
  let skipped = 0;
  for (const raw of items) {
    const item = raw as { table?: unknown; pinId?: unknown; url?: unknown; sentiment?: unknown };
    const sentiment = typeof item.sentiment === 'number' && Number.isFinite(item.sentiment) ? Math.round(Math.max(-1, Math.min(1, item.sentiment)) * 100) / 100 : null;
    if (!(REVIEW_TABLES as readonly string[]).includes(String(item.table)) || !Number.isInteger(item.pinId) || typeof item.url !== 'string' || sentiment == null) {
      skipped++;
      continue;
    }
    const key = `${item.table}:${item.pinId}`;
    const row = byRow.get(key) ?? { table: item.table as ReviewTable, pinId: item.pinId as number, scores: [] };
    row.scores.push({ url: item.url, sentiment });
    byRow.set(key, row);
  }
  let saved = 0;
  for (const { table, pinId, scores } of byRow.values()) {
    const [row] = await db.query<{ reviews: PinReview[] }>(`SELECT "reviews" FROM "${table}" WHERE "pinId" = $1`, [pinId]);
    if (!row) {
      skipped += scores.length;
      continue;
    }
    const byUrl = new Map(scores.map((s) => [s.url, s.sentiment]));
    let changed = 0;
    for (const review of row.reviews) {
      const value = byUrl.get(review.url);
      if (review.sentiment == null && value != null) {
        review.sentiment = value;
        changed++;
      }
    }
    skipped += scores.length - changed;
    if (!changed) continue;
    await db.query(`UPDATE "${table}" SET "reviews" = $1::jsonb WHERE "pinId" = $2`, [JSON.stringify(row.reviews), pinId]);
    saved += changed;
    // Production too when the run writes there; a failure leaves the local copy for the next push.
    await pushReviewSentiment(table, pinId, scores).catch(() => {});
  }
  return { saved, skipped };
}
