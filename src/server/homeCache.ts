// A short-lived copy of the signed-out home page's HTML (2026-10-17). The
// timeline is rendered per request (it opens on "now" and reads the visitor's
// time zone from a cookie), and rendering it was the heaviest thing the one
// Node thread did: 1.1 MB of HTML, 36-49 s to first byte when the VM was
// overloaded. For a visitor with no session the page depends only on its
// language, time zone and the clock, so the first request in a minute renders
// it and the rest are handed that copy. A copy up to STALE_MS old is served
// at once while a fresh one is made in the background. Kept in memory on
// globalThis (one process), so a restart empties it.
//
// Eligibility is decided here (homeCacheKey) and the fetch of the real page is
// the caller's (src/proxy.ts), passed in as `fill`.

export const FRESH_MS = 60_000;
export const STALE_MS = 10 * 60_000;
const MAX_ENTRIES = 60;

export type HomeCopy = { status: number; headers: [string, string][]; body: Uint8Array; madeAt: number };

export type HomeRequest = {
  method: string;
  // The path without its language prefix, the language, and the query string.
  path: string;
  locale: string;
  search: string;
  signedIn: boolean;
  // An RSC fetch or a router prefetch wants a payload, not the document.
  clientNavigation: boolean;
  accept: string | null;
  timeZone: string;
};

// The tz cookie's value if it names a real zone, else UTC (as viewerTimeZone
// reads it; not imported from there, which pulls next/headers into the proxy).
export function validTimeZone(value: string | undefined): string {
  if (!value) return 'UTC';
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return value;
  } catch {
    return 'UTC';
  }
}

// The key a request's copy is kept under, or null when the request must be
// rendered for itself.
export function homeCacheKey(r: HomeRequest): string | null {
  if (r.method !== 'GET' || r.path !== '/' || r.search !== '' || r.signedIn || r.clientNavigation) return null;
  if (!(r.accept ?? '').includes('text/html')) return null;
  return `${r.locale}|${r.timeZone}`;
}

type Store = { copies: Map<string, HomeCopy>; filling: Map<string, Promise<HomeCopy | null>> };

function store(): Store {
  const g = globalThis as unknown as { __chronopinHomeCache?: Store };
  return (g.__chronopinHomeCache ??= { copies: new Map(), filling: new Map() });
}

// For tests.
export function resetHomeCache() {
  const s = store();
  s.copies.clear();
  s.filling.clear();
}

// One fill per key at a time: requests arriving while one runs wait for it.
function fillOnce(key: string, fill: () => Promise<HomeCopy | null>): Promise<HomeCopy | null> {
  const s = store();
  const running = s.filling.get(key);
  if (running) return running;
  const promise = fill()
    .catch(() => null)
    .then((copy) => {
      if (copy) {
        s.copies.delete(key);
        s.copies.set(key, copy);
        if (s.copies.size > MAX_ENTRIES) s.copies.delete(s.copies.keys().next().value!);
      }
      return copy;
    })
    .finally(() => {
      s.filling.delete(key);
    });
  s.filling.set(key, promise);
  return promise;
}

// The copy to answer with, or null when there is none and the fill failed (the
// caller then renders the page itself).
export async function homeCopy(key: string, fill: () => Promise<HomeCopy | null>, now = Date.now()): Promise<HomeCopy | null> {
  const have = store().copies.get(key);
  if (have && now - have.madeAt < FRESH_MS) return have;
  if (have && now - have.madeAt < STALE_MS) {
    void fillOnce(key, fill);
    return have;
  }
  return fillOnce(key, fill);
}
