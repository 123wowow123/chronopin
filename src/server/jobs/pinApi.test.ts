import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiBase, prodBase, pushEventInfo, pushSentiment, scrapeUrl } from './pinApi';
import { sentimentHash } from '../model/pinSentiment';
import { productionWrite } from './productionWrites';

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

  it('does not send production scores for a personal pin', async () => {
    process.env.JOBS_PROD_BASE = 'https://prod.example';
    process.env.JOBS_PROD_SESSION_SECRET = 'prod-secret';
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ id: 5, title: 'T', description: 'D', user: { userName: '@Owner' } }))));
    expect(await pushSentiment(5, 0, '', { title: 'T', description: 'D' })).toBe(false);
    expect(productionWrite).not.toHaveBeenCalled();
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
