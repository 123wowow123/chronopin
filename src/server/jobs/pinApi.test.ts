import { afterEach, describe, expect, it, vi } from 'vitest';
import * as db from '../db';
import { sponsoredTranslationRequest, apiBase, prodBase, pushEventInfo, pushSentiment, scrapeUrl, updatePin } from './pinApi';
import { sentimentHash } from '../model/pinSentiment';
import { productionWrite } from './productionWrites';

vi.mock('../db', () => ({ query: vi.fn() }));
vi.mock('./curators', () => ({ curatorId: async () => 7, isCurator: (h: string | null | undefined) => h === '@TechDesk' }));
vi.mock('../auth', () => ({ signToken: async () => 'local-token' }));
vi.mock('./productionWrites', () => ({ productionWrite: vi.fn(async (write: () => Promise<unknown>) => write()) }));

const env = { ...process.env };
afterEach(() => {
  process.env = { ...env };
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('writing to production', () => {
  it('stays local unless JOBS_PROD_BASE is set', async () => {
    delete process.env.JOBS_PROD_BASE;
    expect(prodBase()).toBeNull();
    expect(await pushEventInfo(1, { fields: {}, source: 'claude' })).toBe(false);
  });

  it('needs the prod secret alongside the address', () => {
    process.env.JOBS_PROD_BASE = 'https://prod.example/';
    delete process.env.JOBS_PROD_SESSION_SECRET;
    expect(() => prodBase()).toThrow(/JOBS_PROD_SESSION_SECRET/);
  });

  it('pushes a score to prod as the pin author, only when the text there is what was scored', async () => {
    process.env.JOBS_PROD_BASE = 'https://prod.example/';
    process.env.JOBS_PROD_SESSION_SECRET = 'prod-secret';
    const calls: { method: string; url: string; auth?: string; body?: any }[] = [];
    vi.stubGlobal('fetch', async (url: string, init: any) => {
      calls.push({ method: init.method, url, auth: init.headers.Authorization, body: init.body && JSON.parse(init.body) });
      const body = init.method === 'GET' ? { id: 5, title: 'T', description: 'D', user: { userName: '@TechDesk' }, references: [], media: [] } : { saved: 1, refused: [] };
      return new Response(JSON.stringify(body), { status: 200 });
    });

    expect(await pushSentiment(5, 0.4, 'Widget', { title: 'T', description: 'D' })).toBe(true);
    const put = calls.find((c) => c.method === 'PUT')!;
    expect(put.url).toBe('https://prod.example/api/pins/sentiments');
    expect(put.auth).toMatch(/^Bearer ey/);
    expect(put.auth).not.toContain('local-token');
    expect(put.body).toEqual([{ id: 5, sentiment: 0.4, product: 'Widget', textHash: sentimentHash({ title: 'T', description: 'D' }) }]);
    expect(productionWrite).toHaveBeenCalledTimes(1);

    calls.length = 0;
    expect(await pushSentiment(5, 0.4, undefined, { title: 'T', description: 'changed' })).toBe(false);
    expect(calls.some((c) => c.method === 'PUT')).toBe(false);
  });

  it('sends an explicitly empty product and honors a server-side text-change refusal', async () => {
    process.env.JOBS_PROD_BASE = 'https://prod.example';
    process.env.JOBS_PROD_SESSION_SECRET = 'prod-secret';
    const fetch = vi.fn(async (_url: string, init: any) => new Response(JSON.stringify(init.method === 'GET'
      ? { id: 5, title: 'T', description: 'D', user: { userName: '@TechDesk' } }
      : { saved: 0, refused: [{ id: 5, reason: 'text changed' }] })));
    vi.stubGlobal('fetch', fetch);
    expect(await pushSentiment(5, 0, '', { title: 'T', description: 'D' })).toBe(false);
    expect(JSON.parse(fetch.mock.calls[1][1].body)[0].product).toBe('');
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('uses admin fallback for non-curator sentiment while retaining hash checks', async () => {
    process.env.JOBS_PROD_BASE = 'https://prod.example';
    process.env.JOBS_PROD_SESSION_SECRET = 'prod-secret';
    vi.mocked(db.query).mockResolvedValue([{ id: 1 }]);
    const fetcher = vi.fn(async (_url: string, init: any) => new Response(JSON.stringify(init.method === 'GET'
      ? { id: 5, title: 'T', description: 'D', user: { id: 99, userName: '@Owner' } }
      : { saved: 1, refused: [] })));
    vi.stubGlobal('fetch', fetcher);
    expect(await pushSentiment(5, 0, '', { title: 'T', description: 'D' })).toBe(true);
    expect(fetcher.mock.calls[1][1].headers.Authorization).toMatch(/^Bearer ey/);
    expect(JSON.parse(fetcher.mock.calls[1][1].body)[0].textHash).toBe(sentimentHash({ title: 'T', description: 'D' }));
    expect(productionWrite).toHaveBeenCalledOnce();
  });

  it('reads and scrapes on this machine even when writing to prod', () => {
    process.env.JOBS_PROD_BASE = 'https://prod.example';
    expect(apiBase()).toMatch(/127\.0\.0\.1|localhost|JOBS_API_BASE/);
  });

  it('does not pace local scrapes or require the production secret for them', async () => {
    process.env.JOBS_PROD_BASE = 'https://prod.example';
    delete process.env.JOBS_PROD_SESSION_SECRET;
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}')));
    await scrapeUrl('https://source.example', '@TechDesk');
    expect(fetch).toHaveBeenCalledWith(`${apiBase()}/api/scrape`, expect.objectContaining({ method: 'POST' }));
    expect(productionWrite).not.toHaveBeenCalled();
  });
});


describe('sponsored translation job API', () => {
  it('reads and writes the production ad API as admin, serializing writes', async () => {
    process.env.JOBS_PROD_BASE = 'https://prod.example';
    process.env.JOBS_PROD_SESSION_SECRET = 'prod-secret';
    vi.mocked(db.query).mockResolvedValue([{ id: 1 }]);
    const fetcher = vi.fn(async (_url: string, _init: any) => new Response(JSON.stringify({ saved: 1 }), { status: 200 }));
    vi.stubGlobal('fetch', fetcher);
    await sponsoredTranslationRequest('GET', '/api/admin/sponsored-ads/translations?after=0&limit=25');
    await sponsoredTranslationRequest('POST', '/api/admin/sponsored-ads/2/translations', { sourceHash: 'h', translations: {} });
    expect(fetcher.mock.calls[0][0]).toBe('https://prod.example/api/admin/sponsored-ads/translations?after=0&limit=25');
    expect(fetcher.mock.calls[1][1].headers.Authorization).toMatch(/^Bearer ey/);
    expect(productionWrite).toHaveBeenCalledOnce();
  });
  it('rejects unrelated admin endpoints and a missing admin account', async () => {
    await expect(sponsoredTranslationRequest('POST', '/api/admin/db/User', {})).rejects.toThrow(/Not a sponsored/);
    vi.mocked(db.query).mockResolvedValue([]);
    await expect(sponsoredTranslationRequest('GET', '/api/admin/sponsored-ads/translations')).rejects.toThrow(/No admin/);
  });
});


describe('routine maintenance across authors', () => {
  it('repairs a non-curator pin through admin, preserves its other fields and reads it back', async () => {
    delete process.env.JOBS_PROD_BASE;
    vi.mocked(db.query).mockResolvedValue([{ id: 1 }]);
    let pin = { id: 5, title: 'Hotel', company: 'Wrong company', user: { id: 99, userName: '@Owner' }, media: [{ originalUrl: 'https://images.example/hotel.jpg' }], references: [{ url: 'https://hotel.example' }] };
    const fetcher = vi.fn(async (_url: string, init: any) => {
      if (init.method === 'PUT') pin = { ...pin, ...JSON.parse(init.body) };
      return new Response(JSON.stringify(pin));
    });
    vi.stubGlobal('fetch', fetcher);
    const saved = await updatePin(5, { company: null, companyId: null });
    expect(saved.company).toBeNull();
    expect(saved.user?.id).toBe(99);
    expect(saved.media).toEqual([{ originalUrl: 'https://images.example/hotel.jpg' }]);
    expect(saved.references).toEqual([{ url: 'https://hotel.example' }]);
    expect(fetcher.mock.calls.map(call => call[1].method)).toEqual(['GET', 'PUT', 'GET']);
    expect(fetcher.mock.calls[1][1].headers.Authorization).toBe('Bearer local-token');
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('admin'));
  });

  it('does not silently accept an author change in the readback', async () => {
    delete process.env.JOBS_PROD_BASE;
    vi.mocked(db.query).mockResolvedValue([{ id: 1 }]);
    let reads = 0;
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init: any) => {
      if (init.method === 'GET') reads++;
      return new Response(JSON.stringify({ id: 5, title: 'Hotel', user: { id: reads > 1 ? 1 : 99, userName: '@Owner' } }));
    }));
    await expect(updatePin(5, { company: null })).rejects.toThrow(/author changed/);
  });
});
