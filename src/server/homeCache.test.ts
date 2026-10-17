import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FRESH_MS, STALE_MS, homeCacheKey, homeCopy, resetHomeCache, type HomeCopy, type HomeRequest } from './homeCache';

const base: HomeRequest = { method: 'GET', path: '/', locale: 'zh', search: '', signedIn: false, clientNavigation: false, accept: 'text/html,application/xhtml+xml', timeZone: 'Asia/Shanghai' };
const copy = (madeAt: number, text = 'x'): HomeCopy => ({ status: 200, headers: [['content-type', 'text/html']], body: new TextEncoder().encode(text), madeAt });

describe('homeCacheKey', () => {
  it('keys a signed-out document request by language and zone', () => {
    expect(homeCacheKey(base)).toBe('zh|Asia/Shanghai');
  });
  it('leaves everything else to render for itself', () => {
    expect(homeCacheKey({ ...base, signedIn: true })).toBeNull();
    expect(homeCacheKey({ ...base, search: '?pin=3' })).toBeNull();
    expect(homeCacheKey({ ...base, path: '/map' })).toBeNull();
    expect(homeCacheKey({ ...base, method: 'POST' })).toBeNull();
    expect(homeCacheKey({ ...base, clientNavigation: true })).toBeNull();
    expect(homeCacheKey({ ...base, accept: '*/*' })).toBeNull();
    expect(homeCacheKey({ ...base, accept: null })).toBeNull();
  });
});

describe('homeCopy', () => {
  beforeEach(resetHomeCache);

  it('renders once and serves the copy while it is fresh', async () => {
    const fill = vi.fn(async () => copy(1_000));
    const a = await homeCopy('k', fill, 1_000);
    const b = await homeCopy('k', fill, 1_000 + FRESH_MS - 1);
    expect(a).toBe(b);
    expect(fill).toHaveBeenCalledTimes(1);
  });

  it('shares one fill between requests that arrive together', async () => {
    let release!: (c: HomeCopy) => void;
    const fill = vi.fn(() => new Promise<HomeCopy>((resolve) => (release = resolve)));
    const first = homeCopy('k', fill, 0);
    const second = homeCopy('k', fill, 0);
    release(copy(0));
    expect(await first).toBe(await second);
    expect(fill).toHaveBeenCalledTimes(1);
  });

  it('serves a stale copy at once and refreshes it behind', async () => {
    await homeCopy('k', async () => copy(0, 'old'), 0);
    let release!: (c: HomeCopy) => void;
    const fill = vi.fn(() => new Promise<HomeCopy>((resolve) => (release = resolve)));
    const stale = await homeCopy('k', fill, FRESH_MS + 1);
    expect(new TextDecoder().decode(stale!.body)).toBe('old');
    expect(fill).toHaveBeenCalledTimes(1);
    release(copy(FRESH_MS + 1, 'new'));
    await Promise.resolve();
    await Promise.resolve();
    const next = await homeCopy('k', fill, FRESH_MS + 2);
    expect(new TextDecoder().decode(next!.body)).toBe('new');
  });

  it('waits for a new render once the copy is too old, and hands back null when it fails', async () => {
    await homeCopy('k', async () => copy(0, 'old'), 0);
    const fresh = await homeCopy('k', async () => copy(STALE_MS + 1, 'new'), STALE_MS + 1);
    expect(new TextDecoder().decode(fresh!.body)).toBe('new');
    resetHomeCache();
    expect(await homeCopy('k', async () => { throw new Error('down'); }, 0)).toBeNull();
    expect(await homeCopy('k', async () => null, 0)).toBeNull();
  });
});
