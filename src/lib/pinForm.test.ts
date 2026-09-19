import { describe, expect, it } from 'vitest';
import { addDays } from './dateClaims';
import { applyScrape, dateInputValue, datesToForm, dayKeyFromInput, EMPTY_FORM, eraOf, formDates, formToDates, formToPin, pinToForm } from './pinForm';
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
  originalStartDate: '2026-04-30',
  delayReasoning: 'Stated: first promised for April.',
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
      originalStartDate: '2026-04-30',
      delayReasoning: 'Stated: first promised for April.',
    });
    expect(body.merchants).toEqual([
      { id: 1, label: 'Amazon', url: 'https://www.amazon.com/x', price: undefined },
      { id: 2, label: 'Best Buy', url: 'https://www.bestbuy.com/y', price: 1299 },
    ]);
    expect(body.media).toEqual(stored.media);
    expect(body.references).toEqual(stored.references);
  });

  it('keeps every medium of an edited pin, not just the heading', () => {
    const video = { id: 5, type: 3, html: '<iframe src="https://www.youtube.com/embed/abc"></iframe>', originalUrl: 'https://www.youtube.com/embed/abc' };
    const withVideo = { ...stored, media: [...stored.media!, video] };
    expect(formToPin(pinToForm(withVideo)).media).toEqual(withVideo.media);
    // A different heading replaces the old one; the rest stay.
    const picked = { ...pinToForm(withVideo), selectedMedia: video };
    expect(formToPin(picked).media).toEqual([video]);
    expect(formToPin({ ...pinToForm(withVideo), useMedia: false }).media).toEqual([video]);
  });

  it('carries ratings through unchanged', () => {
    const ratings = [{ id: 9, source: 'IMDb', score: 8.2, scoreMax: 10, url: 'https://www.imdb.com/title/tt1/' }];
    expect(formToPin(pinToForm({ ...stored, ratings })).ratings).toEqual(ratings);
  });

  it('keeps a scraped trailer and ratings alongside the picked heading', () => {
    const image = { type: 1, originalUrl: 'https://example.com/poster.jpg' };
    const trailer = { type: 3, html: '<iframe></iframe>', originalUrl: 'https://www.youtube.com/embed/xyz' };
    const ratings = [{ source: 'AniList', score: 91, scoreMax: 100 }];
    const next = applyScrape(EMPTY_FORM, { media: [image, trailer], trailer, ratings });
    expect(next.selectedMedia).toEqual(image);
    expect(formToPin(next).media).toEqual([image, trailer]);
    expect(formToPin(next).ratings).toEqual(ratings);
    // Scraping again neither repeats the trailer nor replaces ratings.
    const again = applyScrape(next, { media: [image, trailer], trailer, ratings: [{ source: 'AniList', score: 50, scoreMax: 100 }] });
    expect(again.extraMedia).toEqual([trailer]);
    expect(again.ratings).toEqual(ratings);
    // The trailer picked as the heading is only sent once.
    expect(formToPin({ ...next, selectedMedia: trailer }).media).toEqual([trailer]);
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

describe('BC and early dates in the form', () => {
  it('loads a BC all-day pin as a day key and saves the same instant back', () => {
    const fields = datesToForm({ allDay: true, utcStartDateTime: '-002560-01-01T00:00:00.000Z', utcEndDateTime: '-002560-01-04T00:00:00.000Z' });
    expect(fields).toEqual({ startDate: '-2560-01-01', startTime: '', endDate: '-2560-01-03', endTime: '' });
    expect(formToDates({ allDay: true, ...fields })).toEqual({
      utcStartDateTime: '-002560-01-01T00:00:00.000Z',
      utcEndDateTime: '-002560-01-04T00:00:00.000Z',
    });
  });

  it('keeps years 0-99 instead of reading them as the 1900s', () => {
    expect(formToDates({ allDay: true, startDate: '0079-08-24', startTime: '', endDate: '', endTime: '' }).utcStartDateTime).toBe('0079-08-24T00:00:00.000Z');
    const timed = formToDates({ allDay: false, startDate: '0079-08-24', startTime: '13:00', endDate: '', endTime: '' });
    expect(new Date(timed.utcStartDateTime!).getFullYear()).toBe(79);
    expect(datesToForm({ allDay: false, utcStartDateTime: timed.utcStartDateTime! }).startDate).toBe('0079-08-24');
  });

  it('shows a BC day as its written year with the era beside it', () => {
    expect(dateInputValue('-2560-01-01')).toBe('2561-01-01');
    expect(dateInputValue('2026-09-14')).toBe('2026-09-14');
    expect(eraOf('-2560-01-01')).toBe('BC');
    expect(eraOf('0000-06-15')).toBe('BC');
    expect(eraOf('0001-06-15')).toBe('AD');
    expect(eraOf('')).toBe('AD');
    expect(dayKeyFromInput('2561-01-01', 'BC')).toBe('-2560-01-01');
    expect(dayKeyFromInput('0001-06-15', 'BC')).toBe('0000-06-15');
    expect(dayKeyFromInput('2026-09-14', 'AD')).toBe('2026-09-14');
  });

  it('moves day keys across months, years and eras', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('0000-12-31', 1)).toBe('0001-01-01');
    expect(addDays('-2560-01-01', -1)).toBe('-2561-12-31');
  });
});

describe('stock tickers from a scrape', () => {
  const stocks = [
    { symbol: 'MSFT', name: 'Microsoft', relation: 'related' as const, note: 'Largest investor' },
    { symbol: 'NVDA', name: 'NVIDIA', relation: 'supplier' as const, note: 'GPUs' },
  ];

  it('carries the scrape’s tickers to the POST body', () => {
    const next = applyScrape(EMPTY_FORM, { stocks });
    expect(next.stocks).toEqual(stocks);
    expect(formToPin({ ...next, title: 't' }).stocks).toEqual(stocks);
  });

  it('keeps the tickers already there on a second scrape', () => {
    const first = applyScrape(EMPTY_FORM, { stocks });
    expect(applyScrape(first, { stocks: [{ symbol: 'AAPL', name: 'Apple', relation: 'company', note: null }] }).stocks).toEqual(stocks);
  });

  it('sends none from an edit, which leaves the pin’s tickers alone', () => {
    const edit = pinToForm({ id: 1, title: 't', utcStartDateTime: '2026-09-10T00:00:00.000Z', allDay: true } as PinJson);
    expect(edit.stocks).toEqual([]);
    expect(formToPin(edit).stocks).toBeUndefined();
  });
});

describe('tags on the form', () => {
  const tagged = {
    ...stored,
    tags: [
      { name: 'Tokyo Anime Award Festival 2024', kind: 'award', source: 'award' },
      { name: 'Annie Awards 2023', kind: 'award', source: 'auto' },
      { name: 'Soundbars', kind: 'topic', source: 'user' },
      { name: 'Dolby Atmos', kind: 'topic', source: 'user' },
    ],
  } as PinJson;

  it('edits only the pin’s own tags and sends the whole list back', () => {
    const form = pinToForm(tagged);
    expect(form.tags).toBe('Soundbars, Dolby Atmos');
    expect(formToPin(form).tags).toEqual(['Soundbars', 'Dolby Atmos']);
  });

  it('sends an empty list once every tag is taken off', () => {
    expect(formToPin({ ...pinToForm(tagged), tags: ' , ' }).tags).toEqual([]);
  });

  it('fills an empty tags field from a scrape, never over typed ones', () => {
    expect(applyScrape(EMPTY_FORM, { tags: ['Crunchyroll Anime Awards 2025', 'Frieren'] }).tags).toBe('Crunchyroll Anime Awards 2025, Frieren');
    expect(applyScrape({ ...EMPTY_FORM, tags: 'Mine' }, { tags: ['Theirs'] }).tags).toBe('Mine');
  });
});
