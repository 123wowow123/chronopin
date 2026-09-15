import { describe, expect, it } from 'vitest';
import { applyScrape, EMPTY_FORM, formDates, formToDates, formToPin, pinToForm } from './pinForm';
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
  references: [{ id: 4, url: 'https://example.com/ref', title: 'Press release', confidence: 80, reasoning: 'The press release gives the date as firm.', publishedDate: '2026-09-01', utcCreatedDateTime: '2026-09-02T10:00:00.000Z' }],
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
        { url: '', title: 'no link', confidence: '50', publishedDate: '', startDate: '', endDate: '', reasoning: '' },
        { url: 'https://a.com', title: '', confidence: '', publishedDate: '', startDate: '', endDate: '', reasoning: '' },
        { url: ' https://b.com ', title: '', confidence: '140', publishedDate: '', startDate: '', endDate: '', reasoning: '' },
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
        { url: 'https://kept.example/1', title: 'Mine', confidence: '60', publishedDate: '', startDate: '', endDate: '', reasoning: '' },
        { url: '', title: '', confidence: '', publishedDate: '', startDate: '', endDate: '', reasoning: '' },
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
      { url: 'https://kept.example/1', title: 'Mine', confidence: '60', publishedDate: '', startDate: '', endDate: '', reasoning: '' },
      { url: 'https://new.example/2', title: 'New', confidence: '85', publishedDate: '2026-09-01', startDate: '', endDate: '', reasoning: '' },
    ]);
    expect(applyScrape(typed, {}).references).toBe(typed.references);
  });

  it('keeps the dates the source gave while a reference overrides them', () => {
    const overridden: PinJson = {
      ...stored,
      utcStartDateTime: '2026-11-05T00:00:00.000Z',
      utcEndDateTime: '2026-11-08T00:00:00.000Z',
      sourceStartDateTime: stored.utcStartDateTime,
      sourceEndDateTime: stored.utcEndDateTime,
      references: [{ ...stored.references![0], confidence: 90, startDate: '2026-11-05', endDate: '2026-11-07' }],
    };
    const form = pinToForm(overridden);
    expect([form.startDate, form.endDate]).toEqual(['2026-10-01', '2026-10-03']);
    expect(formToPin(form)).toMatchObject({
      utcStartDateTime: overridden.utcStartDateTime,
      utcEndDateTime: overridden.utcEndDateTime,
      sourceStartDateTime: stored.utcStartDateTime,
      sourceEndDateTime: stored.utcEndDateTime,
    });
  });
});

describe('dates from the most confident claim', () => {
  const reference = (confidence: string, startDate = '', endDate = '', publishedDate = '') => ({ url: `https://r${confidence}${startDate}.example`, title: '', confidence, publishedDate, startDate, endDate, reasoning: '' });
  const allDay = { ...EMPTY_FORM, allDay: true, startDate: '2026-10-01', endDate: '2026-10-03', dateConfidence: 'estimated' };

  it('keeps the source dates when no reference outranks them', () => {
    const picked = formDates({ ...allDay, references: [reference('50', '2026-12-01', '2026-12-02'), reference('90')] });
    expect(picked.overridden).toBe(false);
    expect(picked.dates).toEqual({ utcStartDateTime: '2026-10-01T00:00:00.000Z', utcEndDateTime: '2026-10-04T00:00:00.000Z', sourceStartDateTime: undefined, sourceEndDateTime: undefined });
  });

  it('moves the start to the top reference without moving the source end', () => {
    const picked = formDates({ ...allDay, references: [reference('70', '2026-09-20'), reference('85', '2026-09-25')] });
    expect(picked.startFrom?.confidence).toBe(85);
    expect(picked.dates).toEqual({
      utcStartDateTime: '2026-09-25T00:00:00.000Z',
      utcEndDateTime: '2026-10-04T00:00:00.000Z',
      sourceStartDateTime: '2026-10-01T00:00:00.000Z',
      sourceEndDateTime: '2026-10-04T00:00:00.000Z',
    });
  });

  it('drops a source end that the moved start passes', () => {
    const picked = formDates({ ...allDay, references: [reference('85', '2026-11-05')] });
    expect(picked.dates.utcStartDateTime).toBe('2026-11-05T00:00:00.000Z');
    expect(picked.dates.utcEndDateTime).toBeUndefined();
  });

  it('takes a low-confidence reference end when the source gives none', () => {
    const picked = formDates({ ...allDay, endDate: '', dateConfidence: 'confirmed', references: [reference('30', '', '2026-10-06')] });
    expect(picked.endFrom?.confidence).toBe(30);
    expect(picked.dates.utcStartDateTime).toBe('2026-10-01T00:00:00.000Z');
    expect(picked.dates.utcEndDateTime).toBe('2026-10-07T00:00:00.000Z');
  });

  it('picks the start and the end separately', () => {
    const picked = formDates({ ...allDay, references: [reference('90', '2026-10-02'), reference('80', '', '2026-10-10'), reference('60', '', '2026-10-20')] });
    expect(picked.dates.utcStartDateTime).toBe('2026-10-02T00:00:00.000Z');
    expect(picked.dates.utcEndDateTime).toBe('2026-10-11T00:00:00.000Z');
  });

  it('lets any scored reference outrank an unrated source, and gives ties to the source', () => {
    expect(formDates({ ...allDay, dateConfidence: '', references: [reference('10', '2026-10-09')] }).dates.utcStartDateTime).toBe('2026-10-09T00:00:00.000Z');
    expect(formDates({ ...allDay, references: [reference('50', '2026-10-09')] }).overridden).toBe(false);
  });

  it('breaks a tie between references toward the newer one', () => {
    const picked = formDates({ ...allDay, references: [reference('80', '2026-10-09', '', '2026-01-01'), reference('80', '2026-10-07', '', '2026-06-01')] });
    expect(picked.dates.utcStartDateTime).toBe('2026-10-07T00:00:00.000Z');
  });

  it('drops an end that would fall before the moved start', () => {
    const picked = formDates({ ...allDay, dateConfidence: 'confirmed', references: [reference('95', '2026-10-20'), reference('92', '', '2026-10-05')] });
    expect(picked.dates.utcStartDateTime).toBe('2026-10-20T00:00:00.000Z');
    expect(picked.dates.utcEndDateTime).toBeUndefined();
  });

  it('keeps a timed pin at its local time of day', () => {
    const timed = { ...EMPTY_FORM, allDay: false, startDate: '2026-10-01', startTime: '19:30', endDate: '', endTime: '', dateConfidence: 'estimated' };
    const picked = formDates({ ...timed, references: [reference('80', '2026-10-03', '2026-10-04')] });
    expect(picked.dates.utcStartDateTime).toBe(new Date(2026, 9, 3, 19, 30).toISOString());
    expect(picked.dates.utcEndDateTime).toBe(new Date(2026, 9, 4, 19, 30).toISOString());
  });
});
