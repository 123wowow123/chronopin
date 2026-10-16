import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth';
import { HttpError, json, readJson, route } from '@/server/http';
import Person from '@/server/model/person';
import { readFilings } from '@/server/tradeInput';
import { storeFiling } from '@/server/services/personTrades';

// Saves disclosed trades the importer read (scripts/people/trades.ts), so a
// local run can send them to production. Body: { filings: [{ bioguideId |
// personId, chamber, filingId, filedDate, sourceUrl, trades: [...] }] }.
// New trades tell the person's watchers. Admin only.
export const POST = route(async (request: NextRequest) => {
  await requireRole('admin', request);
  const body = await readJson<{ filings?: unknown }>(request);
  let filings;
  try {
    filings = readFilings(body.filings);
  } catch (err) {
    throw new HttpError(400, '', { message: (err as Error).message });
  }
  let added = 0;
  const missing: string[] = [];
  for (const f of filings) {
    const id = f.personId ?? (f.bioguideId ? await Person.idByBioguide(f.bioguideId) : null);
    if (!id) {
      missing.push(f.bioguideId ?? String(f.personId));
      continue;
    }
    added += await storeFiling(id, f);
  }
  return json({ added, missing });
});
