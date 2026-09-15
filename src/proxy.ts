import { NextResponse, type NextRequest } from 'next/server';
import { pinPath } from '@/lib/seo';
import * as db from '@/server/db';
import { pinPathCache } from '@/server/services/cache';

// Pin URLs are settled here, before rendering starts. Pages stream their
// shell as soon as a request arrives, after which neither a redirect nor a
// 404 can change the HTTP status any more - and crawlers need both: a 308
// from /pin/123 (or a stale slug) to /pin/123/current-title, and a real 404
// for a pin that does not exist.

// Pin edits clear their entry (invalidatePin), so a renamed pin redirects to
// its new slug at once; the TTL only bounds how long anything else lingers.
const TTL_MS = 60_000;
const MAX_ENTRIES = 5_000;

async function canonicalPath(id: number): Promise<string | null> {
  const cache = pinPathCache();
  const hit = cache.get(id);
  if (hit && hit.expires > Date.now()) {
    return hit.path;
  }
  const rows = await db.query<{ id: number; title: string }>(
    `SELECT "id", "title" FROM "Pin" WHERE "id" = $1 AND "utcDeletedDateTime" IS NULL`,
    [id],
  );
  const path = rows.length ? pinPath(rows[0]) : null;
  cache.delete(id);
  cache.set(id, { path, expires: Date.now() + TTL_MS });
  if (cache.size > MAX_ENTRIES) {
    cache.delete(cache.keys().next().value!);
  }
  return path;
}

export async function proxy(request: NextRequest) {
  const match = /^\/(?:map\/)?pin\/([^/]+)(?:\/([^/]*))?\/?$/.exec(request.nextUrl.pathname);
  if (!match) {
    return NextResponse.next();
  }
  const id = Number(match[1]);
  const path = Number.isInteger(id) && id > 0 ? await canonicalPath(id).catch(() => undefined) : null;

  if (path === undefined) {
    // The database is unreachable; let the page handle it.
    return NextResponse.next();
  }
  if (path === null) {
    return NextResponse.rewrite(new URL('/pin-not-found', request.url), { status: 404 });
  }
  if (path !== request.nextUrl.pathname) {
    const url = request.nextUrl.clone();
    url.pathname = path;
    return NextResponse.redirect(url, 308);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/pin/:path*', '/map/pin/:path*'],
};
