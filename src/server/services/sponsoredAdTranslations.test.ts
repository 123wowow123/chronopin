import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AdJson } from '@/lib/ads';
import { LOCALES } from '@/lib/i18n/config';
const mocks = vi.hoisted(() => ({ query: vi.fn(), translate: vi.fn(), expire: vi.fn(), after: vi.fn() }));
vi.mock('../db', () => ({ query: mocks.query }));
vi.mock('../model/ad', () => ({ default: { expireInventory: mocks.expire } }));
vi.mock('next/server', () => ({ after: mocks.after }));
vi.mock('../extract/sponsoredAdTranslation', async (original) => ({ ...await original<typeof import('../extract/sponsoredAdTranslation')>(), translateSponsoredAd: mocks.translate }));
import { localizeSponsoredAds, refreshAdTranslations, scheduleAdTranslation } from './sponsoredAdTranslations';

const source = { id: 2, title: 'Turn off ads', body: '$1/month', translations: {} };
const spanish = { title: 'Sin anuncios', body: '$1/mes' };
const ad = () => ({ key: 'u:2', kind: 'sponsored', title: source.title, body: source.body, url: 'https://www.chronopin.com/profile' }) as AdJson;
beforeEach(() => { vi.clearAllMocks(); });
describe('saved translations', () => {
  it('localizes title and body together while preserving destination', async () => {
    mocks.query.mockResolvedValue([{ ...source, translations: { es: spanish } }]);
    const item = ad();
    await localizeSponsoredAds([item], 'es');
    expect(item).toMatchObject({ ...spanish, url: ad().url });
    expect(mocks.translate).not.toHaveBeenCalled();
  });
  it('keeps the source when disabled, missing or an inventory snapshot is stale', async () => {
    mocks.query.mockResolvedValueOnce([]).mockResolvedValueOnce([{ ...source, translations: {} }]).mockResolvedValueOnce([{ ...source, title: 'Updated copy', translations: { es: spanish } }]);
    for (let i = 0; i < 3; i++) {
      const item = ad(); await localizeSponsoredAds([item], 'es'); expect(item).toEqual(ad());
    }
    expect(mocks.query.mock.calls[0][0]).toContain('AND "autoTranslate"');
  });
  it('does no work for ordinary ads', async () => {
    await localizeSponsoredAds([{ ...ad(), kind: 'product', key: 'p:1' }], 'es');
    expect(mocks.query).not.toHaveBeenCalled();
  });
  it('does not translate disabled ads or already complete translations', async () => {
    mocks.query.mockResolvedValueOnce([]).mockResolvedValueOnce([{ ...source, translations: Object.fromEntries(LOCALES.map((locale) => [locale, spanish])) }]);
    await refreshAdTranslations(2); await refreshAdTranslations(2);
    expect(mocks.translate).not.toHaveBeenCalled();
  });
  it('guards the write against source edits and disabling during generation', async () => {
    mocks.query.mockResolvedValueOnce([source]).mockResolvedValueOnce([]);
    mocks.translate.mockResolvedValue({ es: spanish });
    await refreshAdTranslations(2);
    expect(mocks.query.mock.calls[1][0]).toContain('AND "autoTranslate" AND "title" = $3 AND "body" = $4');
    expect(mocks.query.mock.calls[1][1]).toEqual([2, JSON.stringify({ es: spanish }), source.title, source.body]);
  });
  it('does not persist failed translations', async () => {
    mocks.query.mockResolvedValue([source]); mocks.translate.mockResolvedValue(null);
    await refreshAdTranslations(2);
    expect(mocks.query).toHaveBeenCalledTimes(1);
  });
  it('schedules work after saving only when enabled', () => {
    scheduleAdTranslation({ id: 2, autoTranslate: false }); expect(mocks.after).not.toHaveBeenCalled();
    scheduleAdTranslation({ id: 2, autoTranslate: true }); expect(mocks.after).toHaveBeenCalledOnce();
  });
});
