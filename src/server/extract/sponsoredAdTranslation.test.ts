import { describe, expect, it, vi } from 'vitest';
vi.mock('.', () => ({ getClient: () => null, MODEL: 'test' }));
import { readAdTranslations, translateSponsoredAd } from './sponsoredAdTranslation';
import { LOCALES } from '@/lib/i18n/config';

const source = { title: 'Turn off ads', body: '$1 USD/month. Cancel any time.' };
describe('sponsored ad translations', () => {
  it('accepts every supported language including English', () => {
    const translations = Object.fromEntries(LOCALES.map((locale) => [locale, source]));
    expect(Object.keys(readAdTranslations(translations, source))).toEqual([...LOCALES]);
  });
  it('rejects empty, incomplete, malformed and excessive output', () => {
    expect(readAdTranslations({ en: { title: '', body: source.body }, es: { title: 'Hola', body: '' }, fr: 'text', de: { title: 'x'.repeat(241), body: source.body } }, source)).toEqual({});
    expect(readAdTranslations(null, source)).toEqual({});
  });
  it('keeps an absent body empty rather than inventing copy', () => {
    expect(readAdTranslations({ es: { title: 'Sin anuncios', body: 'invented' } }, { ...source, body: '' })).toEqual({ es: { title: 'Sin anuncios', body: '' } });
  });
  it('leaves original text available when no model is configured', async () => {
    expect(await translateSponsoredAd(source)).toBeNull();
  });
});
