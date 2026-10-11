import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth';
import { HttpError, json, readJson, route } from '@/server/http';
import Person from '@/server/model/person';
import { PersonInputError, readPerson } from '@/server/personInput';
import { invalidatePeople } from '@/server/services/cache';

// Everyone with a page: [{ id, name, slug, role, office, jurisdiction, party, photoUrl }].
export const GET = route(async () => json(await Person.list(), 200, { 'Cache-Control': 'public, max-age=300' }));

// Adds a person, or updates the one the ids or the name match. The body is
// one profile (src/server/personInput.ts); a list present in it replaces
// that list. Admin only: the figures are quoted as sourced.
export const POST = route(async (request: NextRequest) => {
  await requireRole('admin', request);
  let input;
  try {
    input = readPerson(await readJson(request));
  } catch (err) {
    if (err instanceof PersonInputError) throw new HttpError(400, '', { message: err.message });
    throw err;
  }
  const id = await Person.save(input);
  invalidatePeople();
  return json({ id }, 201);
});
