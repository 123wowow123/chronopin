import { afterEach, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth';
import PinSentiment, { sentimentHash } from '@/server/model/pinSentiment';
import { expirePinPage, invalidateTimeline } from '@/server/services/cache';
import { PUT } from './route';

vi.mock('@/server/auth', () => ({ requireRole: vi.fn(), isAdmin: () => false }));
vi.mock('@/server/http', () => ({
  route: (handler: unknown) => handler,
  readJson: (request: Request) => request.json(),
  json: (body: unknown) => Response.json(body),
  HttpError: class extends Error {},
}));
vi.mock('@/server/extract/pinSentiment', () => ({ clampSentiment: (value: number) => Math.max(-1, Math.min(1, value)) }));
vi.mock('@/server/services/cache', () => ({ expirePinPage: vi.fn(), invalidateTimeline: vi.fn() }));
vi.mock('@/server/model/pinSentiment', async (original) => ({
  ...await original<typeof import('@/server/model/pinSentiment')>(),
  default: { context: vi.fn(), set: vi.fn() },
}));

afterEach(() => vi.resetAllMocks());
const context = { title: 'Launch', description: 'A product launches.', companyId: 1, company: 'Company', userId: 7, textHash: null };
function request(rows: unknown[]) {
  return new Request('http://localhost/api/pins/sentiments', { method: 'PUT', body: JSON.stringify(rows) }) as NextRequest;
}
function author() {
  vi.mocked(requireRole).mockResolvedValue({ id: 7 } as Awaited<ReturnType<typeof requireRole>>);
}

it('saves only scores for unchanged text owned by the caller and refreshes their graphs once', async () => {
  author();
  vi.mocked(PinSentiment.context).mockResolvedValue(context);
  const hash = sentimentHash(context);
  const response = await PUT(request([{ id: 1, sentiment: 0.5, product: '', textHash: hash }, { id: 2, sentiment: 0, textHash: hash }]));
  expect(await response.json()).toEqual({ saved: 2, refused: [] });
  expect(PinSentiment.set).toHaveBeenNthCalledWith(1, 1, context, 0.5, '');
  expect(PinSentiment.set).toHaveBeenNthCalledWith(2, 2, context, 0, undefined);
  expect(expirePinPage).toHaveBeenCalledTimes(2);
  expect(invalidateTimeline).toHaveBeenCalledTimes(1);
});

it('does no save or cache invalidation for changed text or another author', async () => {
  author();
  vi.mocked(PinSentiment.context).mockResolvedValueOnce(context).mockResolvedValueOnce({ ...context, userId: 8 });
  const response = await PUT(request([{ id: 1, sentiment: 0, textHash: 'old-hash' }, { id: 2, sentiment: 0, textHash: sentimentHash(context) }]));
  expect(await response.json()).toEqual({ saved: 0, refused: [{ id: 1, reason: 'text changed' }, { id: 2, reason: 'not your pin' }] });
  expect(PinSentiment.set).not.toHaveBeenCalled();
  expect(expirePinPage).not.toHaveBeenCalled();
  expect(invalidateTimeline).not.toHaveBeenCalled();
});
