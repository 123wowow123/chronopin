import type { NextRequest } from 'next/server';
import type { CampaignCycle } from '@/lib/campaigns';
import { requireRole } from '@/server/auth';
import { HttpError, json, readJson, route } from '@/server/http';
import Person from '@/server/model/person';
import PersonCampaign from '@/server/model/personCampaign';
import { invalidatePeople } from '@/server/services/cache';

// Saves campaign finance the importer read (scripts/people/campaigns.ts), so a
// local run can send it to production. Body: { people: [{ bioguideId, cycles }] }.
// Admin only; the importer is the only writer, so the shape is checked loosely.
export const POST = route(async (request: NextRequest) => {
  await requireRole('admin', request);
  const body = await readJson<{ people?: { bioguideId?: string; cycles?: CampaignCycle[] }[] }>(request);
  if (!Array.isArray(body.people) || body.people.length > 50) throw new HttpError(400, '', { message: 'people must be an array of at most 50' });
  let saved = 0;
  const missing: string[] = [];
  for (const p of body.people) {
    const id = p.bioguideId ? await Person.idByBioguide(p.bioguideId) : null;
    if (!id || !Array.isArray(p.cycles)) {
      missing.push(String(p.bioguideId));
      continue;
    }
    if (!p.cycles.every((c) => /^[HS]\d/.test(c.fecCandidateId) && Number.isInteger(c.cycle) && /^https:\/\/www\.fec\.gov\//.test(c.sourceUrl))) throw new HttpError(400, '', { message: 'bad cycle' });
    await PersonCampaign.replace(id, p.cycles);
    saved++;
  }
  try {
    invalidatePeople();
  } catch {}
  return json({ saved, missing });
});
