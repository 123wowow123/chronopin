import type { NextRequest } from 'next/server';
import { requireUser } from '@/server/auth';
import { HttpError, noContent, readJson, route } from '@/server/http';
import { loadUser } from '@/server/services/users';
import { invalidateTimeline } from '@/server/services/cache';
import { isValidSpan } from '@/server/util/createdFilter';

// Save the signed-in user's own preferences. Deliberately narrow: one named
// field, written to the row the token identifies.
export const PUT = route(async (request: NextRequest) => {
  const signedIn = await requireUser(request);
  const raw = (await readJson(request)).defaultFilterSpanPreference;

  if (raw !== null && raw !== undefined && typeof raw !== 'string') {
    throw new HttpError(400, '', { message: 'defaultFilterSpanPreference must be a span string or null' });
  }

  // Stored normalised: the filter reads the value back with a stricter
  // pattern than the one that validates it here.
  const within = (raw || '').trim().toLowerCase().replace(/\s+/g, '') || null;

  // Nothing chosen clears the preference.
  if (within && !isValidSpan(within)) {
    throw new HttpError(400, '', { message: `defaultFilterSpanPreference is not a span the filter accepts: '${within}'` });
  }

  const user = await loadUser(signedIn.id);
  user.defaultFilterSpanPreference = within;
  await user.patchWithoutPassword();
  invalidateTimeline();
  return noContent();
});
