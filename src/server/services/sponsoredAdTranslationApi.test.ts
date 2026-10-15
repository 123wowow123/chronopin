import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ query: vi.fn(), expire: vi.fn() }));
vi.mock('../db', () => ({ query: mocks.query }));
vi.mock('../model/ad', () => ({ default: { expireInventory: mocks.expire } }));
import { adTranslationHash, applyAdTranslations, exportAdTranslations, pendingAdTranslations } from './sponsoredAdTranslationApi';
const source = { id: 2, title: 'Turn off ads', body: '$1 USD/month', autoTranslate: false, translations: { es: { title: 'Sin anuncios', body: '$1 USD/mes' } } };
const translations = { fr: { title: 'Sans publicité', body: '$1 USD/mois' } };
beforeEach(() => { vi.clearAllMocks(); mocks.query.mockResolvedValue([source]); });
describe('session ad translation API', () => {
  it('exports exact source, hash and missing coverage', async () => {
    const result = await exportAdTranslations(2);
    expect(result.sourceHash).toBe(adTranslationHash(source));
    expect(result.translations).toEqual(source.translations);
    expect(result.missingLocales).toContain('fr');
    expect(result.missingLocales).not.toContain('es');
  });
  it('merges selected languages and preserves the disabled setting unless explicitly enabled', async () => {
    mocks.query.mockResolvedValueOnce([source]).mockResolvedValueOnce([{ autoTranslate: false }]);
    expect(await applyAdTranslations(2, { sourceHash: adTranslationHash(source), translations })).toMatchObject({ saved: 1, autoTranslate: false });
    expect(mocks.query.mock.calls[1][1]).toEqual([2, JSON.stringify(translations), source.title, source.body, null]);
    expect(mocks.expire).toHaveBeenCalledOnce();
  });
  it('can enable display with the session translations without generating model output', async () => {
    mocks.query.mockResolvedValueOnce([source]).mockResolvedValueOnce([{ autoTranslate: true }]);
    expect(await applyAdTranslations(2, { sourceHash: adTranslationHash(source), translations, autoTranslate: true })).toMatchObject({ autoTranslate: true });
    expect(mocks.query.mock.calls[1][1][4]).toBe(true);
  });
  it('refuses stale source hashes before any write', async () => {
    await expect(applyAdTranslations(2, { sourceHash: '0'.repeat(64), translations })).rejects.toMatchObject({ status: 409 });
    expect(mocks.query).toHaveBeenCalledTimes(1);
  });
  it('detects an edit racing with the save and does not invalidate inventory', async () => {
    mocks.query.mockResolvedValueOnce([source]).mockResolvedValueOnce([]);
    await expect(applyAdTranslations(2, { sourceHash: adTranslationHash(source), translations })).rejects.toMatchObject({ status: 409 });
    expect(mocks.query.mock.calls[1][0]).toContain('AND "title" = $3 AND "body" = $4');
    expect(mocks.expire).not.toHaveBeenCalled();
  });
  it.each([{}, { xx: { title: 'X', body: 'X' } }, { fr: { title: 'X', body: '' } }, { fr: { title: 'X'.repeat(241), body: 'X' } }, { fr: { title: 'X', body: 12 } }])('rejects invalid translations %j', async (value) => {
    await expect(applyAdTranslations(2, { sourceHash: adTranslationHash(source), translations: value })).rejects.toMatchObject({ status: 422 });
    expect(mocks.expire).not.toHaveBeenCalled();
  });
  it('does not invent body text for a headline-only ad', async () => {
    const empty = { ...source, body: '' }; mocks.query.mockResolvedValue([empty]);
    await expect(applyAdTranslations(2, { sourceHash: adTranslationHash(empty), translations })).rejects.toMatchObject({ status: 422 });
  });
});


describe('ad translation job queue', () => {
  it('exports missing languages for enabled ads in ID order with a continuation', async () => {
    mocks.query.mockResolvedValue([source]);
    const page = await pendingAdTranslations(1, 0);
    expect(page.ads[0]).toMatchObject({ id: 2, sourceHash: adTranslationHash(source) });
    expect(page.ads[0].missingLocales).not.toContain('es');
    expect(page.nextAfter).toBe(2);
    expect(mocks.query.mock.calls[0][0]).toContain('WHERE "autoTranslate"');
    expect(mocks.query.mock.calls[0][1]).toEqual([0, 1]);
  });
  it('keeps a continuation on a fully translated page so later gaps are not missed', async () => {
    const { LOCALES } = await import('@/lib/i18n/config');
    mocks.query.mockResolvedValue([{ ...source, translations: Object.fromEntries(LOCALES.map((l) => [l, { title: 'T', body: 'B' }])) }]);
    expect(await pendingAdTranslations(1, 0)).toEqual({ ads: [], nextAfter: 2 });
    mocks.query.mockResolvedValue([]);
    expect(await pendingAdTranslations(1, 2)).toEqual({ ads: [], nextAfter: null });
  });
});
