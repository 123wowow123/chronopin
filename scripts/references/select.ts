// Pure helpers for the manual reference backfill (list.ts / apply.ts), kept
// apart from the database so they can be tested.

import { urlKey } from '@/lib/citations';
import { MIN_CONFIDENCE, referenceDates } from '@/server/extract/references';

export const MAX_REFERENCES = 5;

export type Candidate = {
  url: string;
  title?: string | null;
  confidence: number;
  publishedDate?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  reasoning?: string | null;
};

// Round-robin, so every batch gets a mix of old and new pins.
export function batchOf<T>(rows: T[], batch: number, of: number): T[] {
  return rows.filter((_, i) => i % of === batch);
}

/**
 * The candidates worth adding to a pin: confident enough, not the pin's own
 * source, not already on the pin, one per page, strongest first, and no more
 * than the pin has room for.
 */
export function freshReferences(
  candidates: Candidate[],
  existingUrls: string[],
  sourceUrl: string | null | undefined,
): Candidate[] {
  const taken = new Set(existingUrls.map(urlKey).filter(Boolean));
  const sourceKey = sourceUrl ? urlKey(sourceUrl) : undefined;
  if (sourceKey) taken.add(sourceKey);

  const kept = new Map<string, Candidate>();
  for (const c of candidates) {
    const key = urlKey(c.url);
    const confidence = Math.round(Number(c.confidence));
    if (!key || taken.has(key) || kept.has(key)) continue;
    if (!Number.isFinite(confidence) || confidence < MIN_CONFIDENCE || confidence > 100) continue;
    const { startDate, endDate } = referenceDates(c);
    kept.set(key, {
      url: c.url.trim(),
      title: c.title?.trim().slice(0, 1024) || null,
      confidence,
      publishedDate: /^\d{4}-\d{2}-\d{2}$/.test(c.publishedDate || '') ? c.publishedDate : null,
      startDate: startDate ?? null,
      endDate: endDate ?? null,
      reasoning: c.reasoning?.trim().slice(0, 2000) || null,
    });
  }
  const room = Math.max(0, MAX_REFERENCES - existingUrls.length);
  return [...kept.values()].sort((a, b) => b.confidence - a.confidence).slice(0, room);
}
