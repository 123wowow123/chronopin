import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiBase, prodBase, pushEventInfo, pushSentiment } from './pinApi';

vi.mock('./curators', () => ({ curatorId: async () => 7, isCurator: (h: string | null | undefined) => h === '@TechDesk' }));
vi.mock('../auth', () => ({ signToken: async () => 'local-token' }));

const env = { ...process.env };
afterEach(() => {
  process.env = { ...env };
  vi.unstubAllGlobals();
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
      const body = init.method === 'GET' ? { id: 5, title: 'T', description: 'D', user: { userName: '@TechDesk' }, references: [], media: [] } : {};
      return new Response(JSON.stringify(body), { status: 200 });
    });

    expect(await pushSentiment(5, 0.4, 'Widget', { title: 'T', description: 'D' })).toBe(true);
    const put = calls.find((c) => c.method === 'PUT')!;
    expect(put.url).toBe('https://prod.example/api/pins/5');
    expect(put.auth).toMatch(/^Bearer ey/);
    expect(put.auth).not.toContain('local-token');
    expect(put.body).toMatchObject({ sentiment: 0.4, productLine: 'Widget' });

    calls.length = 0;
    expect(await pushSentiment(5, 0.4, undefined, { title: 'T', description: 'changed' })).toBe(false);
    expect(calls.some((c) => c.method === 'PUT')).toBe(false);
  });

  it('reads and scrapes on this machine even when writing to prod', () => {
    process.env.JOBS_PROD_BASE = 'https://prod.example';
    expect(apiBase()).toMatch(/127\.0\.0\.1|localhost|JOBS_API_BASE/);
  });
});
