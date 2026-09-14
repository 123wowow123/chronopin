import { describe, expect, it } from 'vitest';
import { applyScrape, EMPTY_FORM, formToDates, formToPin, pinToForm } from './pinForm';
import type { PinJson } from './types';

const stored: PinJson = {
  id: 7,
  title: 'Sonos Beam Ultra',
  description: '<p>Soundbar</p>',
  sourceUrl: 'https://example.com/beam',
  longFormSummary: '<ul><li>Point</li></ul>',
  utcStartDateTime: '2026-10-01T00:00:00.000Z',
  utcEndDateTime: '2026-10-04T00:00:00.000Z',
  allDay: true,
  category: 'Consumer Electronics',
  company: 'Sonos',
  companyWikiUrl: 'https://en.wikipedia.org/wiki/Sonos',
  address: 'Santa Barbara, California',
  latitude: 34.42,
  longitude: -119.7,
  price: 1299,
  priceCurrency: 'USD',
  dateConfidence: 'scheduled',
  dateConfidenceReasoning: 'Given as scheduled',
  merchants: [
    { id: 1, label: 'Amazon', url: 'https://www.amazon.com/x' },
    { id: 2, label: 'Best Buy', url: 'https://www.bestbuy.com/y', price: 1299 },
  ],
  references: [{ id: 4, url: 'https://example.com/ref', title: 'Press release', confidence: 80, publishedDate: '2026-09-01', utcCreatedDateTime: '2026-09-02T10:00:00.000Z' }],
  media: [{ id: 3, type: 1, thumbName: 't.jpg', originalUrl: 'https://example.com/i.jpg' }],
};

describe('pin form round trip', () => {
  it('keeps every field of an edited pin', () => {
    const body = formToPin(pinToForm(stored));
    expect(body).toMatchObject({
      id: 7,
      title: stored.title,
      description: stored.description,
      longFormSummary: stored.longFormSummary,
      utcStartDateTime: stored.utcStartDateTime,
      utcEndDateTime: stored.utcEndDateTime,
      allDay: true,
      category: stored.category,
      company: 'Sonos',
      companyWikiUrl: stored.companyWikiUrl,
      address: stored.address,
      latitude: 34.42,
      longitude: -119.7,
      price: 1299,
      priceCurrency: 'USD',
      dateConfidence: 'scheduled',
      dateConfidenceReasoning: 'Given as scheduled',
    });
    expect(body.merchants).toEqual([
      { id: 1, label: 'Amazon', url: 'https://www.amazon.com/x', price: undefined },
      { id: 2, label: 'Best Buy', url: 'https://www.bestbuy.com/y', price: 1299 },
    ]);
    expect(body.media).toEqual(stored.media);
    expect(body.references).toEqual(stored.references);
  });

  it('drops reference rows without a link or a confidence and clamps confidence', () => {
    const form = {
      ...pinToForm(stored),
      references: [
        { url: '', title: 'no link', confidence: '50', publishedDate: '' },
        { url: 'https://a.com', title: '', confidence: '', publishedDate: '' },
        { url: ' https://b.com ', title: '', confidence: '140', publishedDate: '' },
      ],
    };
    expect(formToPin(form).references).toEqual([{ id: undefined, url: 'https://b.com', title: undefined, confidence: 100, publishedDate: undefined, utcCreatedDateTime: undefined }]);
  });

  it('drops the wiki link when the company is renamed', () => {
    const form = { ...pinToForm(stored), company: 'Apple' };
    expect(formToPin(form).companyWikiUrl).toBeUndefined();
  });

  it('treats a last day on or before the start as a one-day pin', () => {
    expect(formToDates({ allDay: true, startDate: '2026-10-01', startTime: '', endDate: '2026-10-01', endTime: '' })).toEqual({
      utcStartDateTime: '2026-10-01T00:00:00.000Z',
      utcEndDateTime: undefined,
    });
  });

  it('fills only empty fields from a scrape', () => {
    const typed = { ...EMPTY_FORM, title: 'Mine' };
    const next = applyScrape(typed, { title: 'Scraped', company: 'Sonos', companyWikiUrl: 'w', category: 'Energy', merchants: [{ label: 'Amazon', url: 'u' }] });
    expect(next.title).toBe('Mine');
    expect(next.company).toBe('Sonos');
    expect(next.companyWikiUrl).toBe('w');
    expect(next.category).toBe('Energy');
    expect(next.merchants).toHaveLength(1);
  });

  it('adds scraped references after those already listed, skipping repeats and the source', () => {
    const typed = {
      ...EMPTY_FORM,
      sourceUrl: 'https://src.example/a',
      references: [
        { url: 'https://kept.example/1', title: 'Mine', confidence: '60', publishedDate: '' },
        { url: '', title: '', confidence: '', publishedDate: '' },
      ],
    };
    const next = applyScrape(typed, {
      references: [
        { url: 'https://kept.example/1', title: 'Dupe', confidence: 95 },
        { url: 'https://src.example/a', confidence: 90 },
        { url: 'https://new.example/2', title: 'New', confidence: 85, publishedDate: '2026-09-01' },
      ],
    });
    expect(next.references).toEqual([
      { url: 'https://kept.example/1', title: 'Mine', confidence: '60', publishedDate: '' },
      { url: 'https://new.example/2', title: 'New', confidence: '85', publishedDate: '2026-09-01' },
    ]);
    expect(applyScrape(typed, {}).references).toBe(typed.references);
  });
});
