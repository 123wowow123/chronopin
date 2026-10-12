// Rejects on a non-2xx status, so callers' catch paths still fire.
export async function fetchJson<T = any>(
  url: string,
  { method = 'GET', body, timeoutMs }: { method?: string; body?: unknown; timeoutMs?: number } = {},
): Promise<T> {
  const init: RequestInit = { method };
  // A stalled service then fails the call instead of holding the page open.
  if (timeoutMs) init.signal = AbortSignal.timeout(timeoutMs);
  if (body !== undefined) {
    init.body = JSON.stringify(body);
    init.headers = { 'Content-Type': 'application/json' };
  }
  const res = await fetch(url, init);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${method} ${url} failed with ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}
