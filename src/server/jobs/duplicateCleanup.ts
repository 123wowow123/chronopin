// The duplicates task (docs/okf/scraping/daily-jobs.md#duplicates): works the
// "Possible duplicates" the app has suggested (PinDuplicate) down, a small batch
// a run. Pairs are read from, and decided on, the database the run writes to
// (production when it is set to), since each has its own pairs and ids.

import { urlKey } from '@/lib/citations';
import { ApiCallError, decideDuplicatePair, deletedPinIds, duplicateRows, getPin, markDuplicate, setAsideDuplicates, type DuplicateRow, type PinJson } from './pinApi';

export const DUPLICATE_BATCH = 20;
export const MAX_DUPLICATE_BATCH = 30;
export const DUPLICATE_DECISIONS = ['same', 'different', 'unsure'] as const;
export type DuplicateDecision = (typeof DUPLICATE_DECISIONS)[number];

// Same source URL first (the likeliest real repeats), then the closest titles.
const ORDER = 'order=-reason,-score,pinId,otherPinId';

const plain = (html: unknown) => String(html ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 600);

const links = (pin: PinJson): string[] => [pin.sourceUrl, ...((pin.references ?? []) as { url: string }[]).map((r) => r.url)].filter(Boolean).map((url) => urlKey(url) ?? String(url));

// A pin as far as telling two apart needs.
export function duplicateEvidence(pin: PinJson) {
  return {
    id: pin.id,
    title: pin.title,
    description: plain(pin.description),
    utcStartDateTime: pin.utcStartDateTime,
    utcEndDateTime: pin.utcEndDateTime ?? null,
    allDay: !!pin.allDay,
    address: pin.address ?? null,
    company: pin.company?.name ?? pin.company ?? null,
    categories: pin.categories ?? [],
    author: pin.user?.userName ?? null,
    parentId: pin.parentId ?? null,
    utcCreatedDateTime: pin.utcCreatedDateTime,
    favoriteCount: pin.favoriteCount ?? 0,
    viewCount: pin.viewCount ?? 0,
    sourceUrl: pin.sourceUrl ?? null,
    references: ((pin.references ?? []) as { url: string; title?: string | null }[]).map((r) => ({ url: r.url, title: r.title ?? null })),
  };
}

export function sharedLinks(a: PinJson, b: PinJson): string[] {
  const other = new Set(links(b));
  return [...new Set(links(a))].filter((link) => other.has(link));
}

// Pages of unjudged pairs read for one batch, and how many pairs a page holds:
// most may hold a deleted pin, and those are set aside a page at a time.
const PAGE = 100;
const MAX_PAGES = 10;
export const GONE_REASON = 'A pin in this pair has been deleted.';

// The next undecided pairs: ones already judged 'same' or 'different' but not
// yet decided, then ones never judged. An 'unsure' pair is left for a person. A
// pair with a deleted pin is marked unsure here, so it stops coming back.
export async function duplicateBatch(limit = DUPLICATE_BATCH) {
  const pairs: unknown[] = [];
  const taken = new Set<string>();
  let gone = 0;

  // Fills the batch from a page of rows, and returns the page's deleted pins.
  const take = async (rows: DuplicateRow[]): Promise<number[]> => {
    const dead = new Set(await deletedPinIds([...new Set(rows.flatMap((row) => [row.pinId, row.otherPinId]))]));
    for (const row of rows) {
      if (pairs.length >= limit) break;
      const key = `${row.pinId}/${row.otherPinId}`;
      if (taken.has(key) || dead.has(row.pinId) || dead.has(row.otherPinId)) continue;
      const [a, b] = await Promise.all([getPin(row.pinId), getPin(row.otherPinId)]);
      taken.add(key);
      pairs.push({ pinId: row.pinId, otherPinId: row.otherPinId, reason: row.reason, score: row.score, verdict: row.verdict, verdictReasoning: row.verdictReasoning, sharedLinks: sharedLinks(a, b), pins: [duplicateEvidence(a), duplicateEvidence(b)] });
    }
    return [...dead];
  };

  const judged = await duplicateRows(`status=suggested&verdict.in=same,different&${ORDER}&limit=${PAGE}`);
  // A judged pair keeps its verdict; one with a deleted pin is only passed over.
  if (judged.rows.length) await take(judged.rows);

  let undecided = judged.total;
  for (let page = 0; page < MAX_PAGES; page++) {
    const fresh = await duplicateRows(`status=suggested&verdict.null=true&${ORDER}&limit=${PAGE}`);
    if (page === 0) undecided += fresh.total;
    if (!fresh.rows.length) break;
    const dead = await take(fresh.rows);
    if (dead.length) gone += await setAsideDuplicates(dead, GONE_REASON);
    // With nothing set aside the next read would be this page again.
    if (pairs.length >= limit || !dead.length) break;
  }
  return { undecided: undecided - gone, gone, pairs: pairs as DuplicatePair[] };
}

export type DuplicatePair = Pick<DuplicateRow, 'pinId' | 'otherPinId' | 'reason' | 'score' | 'verdict' | 'verdictReasoning'> & { sharedLinks: string[]; pins: ReturnType<typeof duplicateEvidence>[] };

export function decisionProblem(decision: unknown, reasoning: unknown): string | undefined {
  if (!DUPLICATE_DECISIONS.includes(decision as DuplicateDecision)) return `decision must be one of ${DUPLICATE_DECISIONS.join(', ')}`;
  if (typeof reasoning !== 'string' || reasoning.trim().length < 20) return 'reasoning must say what makes them one event or two (at least 20 characters)';
  return undefined;
}

// Records the judgement and acts on it: 'same' confirms the pair (the newer
// pin's links go to the older, and threads are tidied), 'different' rejects it,
// 'unsure' leaves it suggested for a person.
export async function decideDuplicate(pinId: number, otherPinId: number, decision: DuplicateDecision, reasoning: string) {
  const problem = decisionProblem(decision, reasoning);
  if (problem) throw new ApiCallError(400, problem);
  const [a, b] = pinId < otherPinId ? [pinId, otherPinId] : [otherPinId, pinId];
  const find = async (): Promise<DuplicateRow | undefined> => (await duplicateRows(`pinId=${a}&otherPinId=${b}&limit=1`)).rows[0];
  const row = await find();
  if (!row) throw new ApiCallError(404, `Pins ${a} and ${b} are not a suggested pair`);
  if (row.status !== 'suggested') throw new ApiCallError(409, `Pins ${a} and ${b} are already ${row.status}`);
  // The verdict first: should the decision fail, the pair comes back judged.
  await markDuplicate(a, b, decision, reasoning.trim());
  if (decision !== 'unsure') await decideDuplicatePair(a, b, decision === 'same' ? 'confirmed' : 'rejected');
  const saved = await find();
  const expected = decision === 'same' ? 'confirmed' : decision === 'different' ? 'rejected' : 'suggested';
  if (saved?.status !== expected || saved.verdict !== decision) throw new Error(`Pins ${a}/${b}: readback shows ${saved?.status}/${saved?.verdict}, expected ${expected}/${decision}`);
  return { pinId: a, otherPinId: b, status: saved.status, verdict: saved.verdict };
}
