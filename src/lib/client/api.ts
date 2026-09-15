'use client';

// Small fetch wrappers for the JSON API. The session travels in the httpOnly
// token cookie, so nothing here handles tokens.

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown,
  ) {
    super(message);
  }
}

async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
  const init: RequestInit = { method, credentials: 'same-origin', headers: {} };
  if (body instanceof FormData) {
    init.body = body;
  } else if (body !== undefined) {
    init.body = JSON.stringify(body);
    (init.headers as Record<string, string>)['Content-Type'] = 'application/json';
  }
  const res = await fetch(url, init);
  const text = await res.text();
  let data: unknown = text;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // plain-text error bodies
  }
  if (!res.ok) {
    const message = (data as { message?: string })?.message || (typeof data === 'string' && data) || res.statusText;
    throw new ApiError(res.status, message, data);
  }
  return data as T;
}

export const api = {
  get: <T>(url: string) => request<T>('GET', url),
  post: <T>(url: string, body?: unknown) => request<T>('POST', url, body),
  put: <T>(url: string, body?: unknown) => request<T>('PUT', url, body),
  patch: <T>(url: string, body?: unknown) => request<T>('PATCH', url, body),
  delete: <T>(url: string, body?: unknown) => request<T>('DELETE', url, body),
};

// Pagination cursors from a Link header: { previous: '?from_date_time=...', next: ... }.
export function parseLinkHeader(header: string | null): Record<string, string> {
  const links: Record<string, string> = {};
  for (const part of (header || '').split(',')) {
    const match = /<([^>]+)>\s*;\s*rel="([^"]+)"/.exec(part);
    if (match) {
      const url = new URL(match[1], 'http://localhost');
      links[match[2]] = url.search;
    }
  }
  return links;
}
