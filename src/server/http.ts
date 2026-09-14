// Helpers shared by the route handlers in src/app/api and src/app/auth.

import { unstable_rethrow } from 'next/navigation';
import type { NextRequest } from 'next/server';
import type BasePins from './model/basePins';
import { HttpError } from './util/httpError';
import log from './util/log';

export { HttpError };

// JSON through JSON.stringify, so the models' toJSON (which drops nulls,
// private fields and password hashes) always applies.
export function json(data: unknown, status = 200, headers?: HeadersInit): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers },
  });
}

export function noContent(status = 204): Response {
  return new Response(null, { status });
}

// Wraps a handler so an HttpError becomes its status and message, and
// anything else a 500, instead of Next.js's generic error page.
export function route<Args extends unknown[]>(fn: (...args: Args) => Promise<Response>) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (err) {
      // Next.js signals dynamic rendering, redirects and notFound() by throwing.
      unstable_rethrow(err);
      if (err instanceof HttpError) {
        if (err.body !== undefined) {
          return json(err.body, err.status);
        }
        return new Response(err.message, { status: err.status });
      }
      log.error('route error:', err instanceof Error ? err.stack || err.message : err);
      return new Response(err instanceof Error ? err.message : 'Internal Server Error', { status: 500 });
    }
  };
}

// A positive integer route parameter, or a 404 (as Express gave for a pin id
// that matched no pin).
export function intParam(value: string): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) {
    throw new HttpError(404, 'Not Found');
  }
  return n;
}

export async function readJson<T = Record<string, any>>(request: Request): Promise<T> {
  try {
    const text = await request.text();
    return (text ? JSON.parse(text) : {}) as T;
  } catch {
    throw new HttpError(400, 'Request body is not valid JSON');
  }
}

// The URL this request came in on, as the client sees it. Behind the
// Kubernetes load balancer the scheme arrives in X-Forwarded-Proto.
export function publicOrigin(request: NextRequest): string {
  const proto = request.headers.get('x-forwarded-proto')?.split(',')[0].trim() || request.nextUrl.protocol.replace(':', '');
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || request.nextUrl.host;
  return `${proto}://${host}`;
}

// RFC 5988 pagination links for a page of the timeline: previous starts
// before its earliest pin, next after its latest. Any active filter rides
// along, since the client hands each link straight back as the next query.
export function paginationLink(
  request: NextRequest,
  pins: BasePins,
  carryParams?: Record<string, string | null | undefined> | null,
): string | undefined {
  const range = pins.minMaxDateTimePin();
  if (!range) {
    return undefined;
  }
  const urlPrefix = publicOrigin(request) + request.nextUrl.pathname;
  const carried = Object.entries(carryParams || {})
    .filter(([, value]) => value !== null && value !== undefined)
    .map(([key, value]) => `&${encodeURIComponent(key)}=${encodeURIComponent(value!)}`)
    .join('');
  const previous = `${urlPrefix}?from_date_time=-${toIso(range.min.utcStartDateTime)}&last_pin_id=${range.min.id}${carried}`;
  const next = `${urlPrefix}?from_date_time=${toIso(range.max.utcStartDateTime)}&last_pin_id=${range.max.id}${carried}`;
  return `<${previous}>; rel="previous", <${next}>; rel="next"`;
}

function toIso(value: Date | string) {
  return new Date(value).toISOString();
}

export function paginationHeaders(link: string | undefined, queryCount: number | undefined): HeadersInit {
  return link ? { Link: link, 'X-Range-Count': String(queryCount ?? '') } : {};
}
