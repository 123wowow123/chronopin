// The duplicates task (docs/okf/scraping/daily-jobs.md#duplicates): works the
// "Possible duplicates" the app has suggested (PinDuplicate) down, a small batch
// a run. Pairs are read from, and decided on, the database the run writes to
// (production when it is set to), since each has its own pairs and ids.

import { urlKey } from '@/lib/citations';
import { ApiCallError, decideDuplicatePair, duplicateRows, getPin, markDuplicate, type DuplicateRow, type PinJson } from './pinApi';

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

const live = async (id: number): Promise<PinJson | null> => {
  try {
    const pin = await getPin(id);
    return pin.utcDeletedDateTime ? null : pin;
  } catch (err) {
    if (err instanceof ApiCallError && err.status === 404) return null;
    throw err;
  }
};

// The next undecided pairs: ones already judged 'same' or 'different' but not
// yet decided, then ones never judged. An 'unsure' pair is left for a person. A
// pair with a deleted pin is marked unsure here, so it stops coming back.
export async function duplicateBatch(limit = DUPLICATE_BATCH) {
  const judged = await duplicateRows(`status=suggested&verdict.in=same,different&${ORDER}&limit=${limit}`);
  const fresh = await duplicateRows(`status=suggested&verdict.null=true&${ORDER}&limit=${limit * 3}`);
  const pairs = [];
  let gone = 0;
  for (const row of [...judged.rows, ...fresh.rows]) {
    if (pairs.length >= limit) break;
    const [a, b] = await Promise.all([live(row.pinId), live(row.otherPinId)]);
    if (!a || !b) {
      await markDuplicate(row.pinId, row.otherPinId, 'unsure', `Pin ${!a ? row.pinId : row.otherPinId} has been deleted.`);
      gone++;
      continue;
    }
    pairs.push({ pinId: row.pinId, otherPinId: row.otherPinId, reason: row.reason, score: row.score, verdict: row.verdict, verdictReasoning: row.verdictReasoning, sharedLinks: sharedLinks(a, b), pins: [duplicateEvidence(a), duplicateEvidence(b)] });
  }
  return { undecided: judged.total + fresh.total - gone, gone, pairs };
}

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
