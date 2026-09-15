// Rejects on a non-2xx status, so callers' catch paths still fire.
export async function fetchJson<T = any>(
  url: string,
  { method = 'GET', body }: { method?: string; body?: unknown } = {},
): Promise<T> {
  const init: RequestInit = { method };
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
