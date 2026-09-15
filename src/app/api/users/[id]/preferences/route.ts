import type { NextRequest } from 'next/server';
import { requireUser } from '@/server/auth';
import { HttpError, noContent, readJson, route } from '@/server/http';
import { loadUser } from '@/server/services/users';
import { invalidateTimeline } from '@/server/services/cache';
import { isValidSpan } from '@/server/util/createdFilter';
import { isThemePreference } from '@/lib/theme';

// Save the signed-in user's own preferences. Deliberately narrow: named
// fields, written to the row the token identifies. A field left out of the
// body is left as it is, so each setting can be saved on its own.
export const PUT = route(async (request: NextRequest) => {
  const signedIn = await requireUser(request);
  const body = await readJson(request);
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new HttpError(400, '', { message: 'Expected an object of preferences' });
  }
  const user = await loadUser(signedIn.id);
  const spanChanged = 'defaultFilterSpanPreference' in body;

  if (spanChanged) {
    const raw = body.defaultFilterSpanPreference;
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
    user.defaultFilterSpanPreference = within;
  }

  if ('themePreference' in body) {
    const theme = body.themePreference;
    if (theme !== null && !isThemePreference(theme)) {
      throw new HttpError(400, '', { message: "themePreference must be 'dark', 'light', 'system' or null" });
    }
    user.themePreference = theme;
  }

  await user.patchWithoutPassword();
  if (spanChanged) {
    invalidateTimeline();
  }
  return noContent();
});
