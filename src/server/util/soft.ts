// Optional page data should not take the page down: a failed read logs and
// yields the fallback, so the panel it feeds simply doesn't render.

import log from '@/server/util/log';

export async function soft<T, F>(read: Promise<T> | T, fallback: F, what = 'optional data'): Promise<T | F> {
  try {
    return await read;
  } catch (err) {
    log.error(`${what} failed:`, err instanceof Error ? err.message : String(err));
    return fallback;
  }
}
