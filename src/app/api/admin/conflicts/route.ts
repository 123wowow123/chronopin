import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth';
import { inBackground } from '@/server/background';
import { HttpError, json, readJson, route } from '@/server/http';
import { applyEdit, classifyNames, classifyTickers, readEdit, rebuildWikis, refreshSeats, status, WIKI_KINDS, type WikiKind } from '@/server/services/conflictData';
import { invalidatePeople } from '@/server/services/cache';

const STEPS = ['seats', 'names', 'sectors', 'wikis'] as const;

// The data behind the conflict-of-interest mark on stock trades and the OKF wikis built from it
// (docs/people.md). Admin only.
//
//   GET   counts: committee seats, tickers (and how many have no sector), committee / filing / company wikis
//   POST  { steps?: ['seats','names','sectors','wikis'], wikis?: ['committees','filings','companies'] }
//         runs the refreshes in that order (default all but sectors): seats re-reads today's committees from
//         congress-legislators; names classifies bonds, funds and ADRs by name; sectors classifies new tickers
//         from SEC SIC codes (minutes - runs in the background, answers 202); wikis rebuilds the wikis.
//   PUT   { tickers?: [{ ticker, sector|null }], committees?: [{ committeeId, sectors: [...] }] }
//         sets a ticker's sector or the sectors a committee oversees by hand, and rebuilds the wikis it changes.
//         Sectors: defense, energy, utilities, finance, realestate, healthcare, tech, telecom, transport,
//         agriculture, materials, industrial, consumer.
export const GET = route(async (request: NextRequest) => {
  await requireRole('admin', request);
  return json(await status());
});

export const POST = route(async (request: NextRequest) => {
  await requireRole('admin', request);
  const body = await readJson<{ steps?: unknown; wikis?: unknown }>(request).catch(() => ({}) as { steps?: unknown; wikis?: unknown });
  const steps = body.steps === undefined ? STEPS.filter((s) => s !== 'sectors') : body.steps;
  if (!Array.isArray(steps) || !steps.every((s) => (STEPS as readonly string[]).includes(s))) throw new HttpError(400, '', { message: `steps: a list of ${STEPS.join(', ')}` });
  const kinds = body.wikis === undefined ? WIKI_KINDS : body.wikis;
  if (!Array.isArray(kinds) || !kinds.every((k) => (WIKI_KINDS as string[]).includes(k))) throw new HttpError(400, '', { message: `wikis: a list of ${WIKI_KINDS.join(', ')}` });
  const result: Record<string, unknown> = {};
  let background = false;
  for (const step of STEPS.filter((s) => steps.includes(s))) {
    if (step === 'seats') result.seats = await refreshSeats();
    else if (step === 'names') result.names = await classifyNames();
    else if (step === 'sectors') {
      background = true;
      inBackground(classifyTickers().then(() => rebuildWikis(kinds as WikiKind[])));
      result.sectors = 'started';
    } else result.wikis = await rebuildWikis(kinds as WikiKind[]);
  }
  invalidatePeople();
  return json(result, background ? 202 : 200);
});

export const PUT = route(async (request: NextRequest) => {
  await requireRole('admin', request);
  let edit;
  try {
    edit = readEdit(await readJson(request));
  } catch (err) {
    throw new HttpError(400, '', { message: (err as Error).message });
  }
  if (!edit.tickers && !edit.committees) throw new HttpError(400, '', { message: 'Expected { tickers } and/or { committees }' });
  const result = await applyEdit(edit);
  invalidatePeople();
  return json(result);
});
