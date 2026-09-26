import { describe, expect, it } from 'vitest';
import { isAttendableEvent, pinJsonLd } from './seo';
import type { PinJson } from './types';

const place = { address: 'Moscone Center, San Francisco, CA', latitude: 37.784, longitude: -122.401 };

function pin(fields: Partial<PinJson>): PinJson {
  return { id: 1, title: 'A pin', utcStartDateTime: '2027-10-12T00:00:00.000Z', allDay: true, ...fields } as PinJson;
}

describe('isAttendableEvent', () => {
  it('counts conferences and festivals, whatever else they are about', () => {
    expect(isAttendableEvent(pin({ ...place, categories: ['Conference', 'Software'] }))).toBe(true);
    expect(isAttendableEvent(pin({ ...place, categories: ['Movie', 'Art', 'Festival'] }))).toBe(true);
  });

  it('counts a match, and a show with a time, but not a deal or a release', () => {
    expect(isAttendableEvent(pin({ ...place, categories: ['Sports'] }))).toBe(true);
    expect(isAttendableEvent(pin({ ...place, categories: ['Music'], allDay: false }))).toBe(true);
    expect(isAttendableEvent(pin({ ...place, categories: ['Music'] }))).toBe(false);
    expect(isAttendableEvent(pin({ ...place, categories: ['Sports', 'Business'] }))).toBe(false);
    expect(isAttendableEvent(pin({ ...place, categories: ['Fashion', 'Sports'] }))).toBe(false);
  });

  it('does not count a release placed at its studio, or anything without a place', () => {
    expect(isAttendableEvent(pin({ ...place, categories: ['Anime'] }))).toBe(false);
    expect(isAttendableEvent(pin({ ...place, categories: ['Business'] }))).toBe(false);
    expect(isAttendableEvent(pin({ categories: ['Conference'] }))).toBe(false);
  });
});

describe('pinJsonLd', () => {
  it('ends a one-day all-day event on its day, and gives the organizer its website', () => {
    const [article] = pinJsonLd(pin({ ...place, categories: ['Conference'], company: 'Salesforce' }), 'en', { organizerUrl: 'https://www.salesforce.com' });
    const event = (article as { about: Record<string, unknown> }).about;
    expect(event.startDate).toBe('2027-10-12');
    expect(event.endDate).toBe('2027-10-12');
    expect(event.organizer).toMatchObject({ name: 'Salesforce', url: 'https://www.salesforce.com' });
  });

  it('ends a multi-day all-day event on its last day, and leaves a timed one without an end open', () => {
    const [multi] = pinJsonLd(pin({ ...place, categories: ['Festival'], utcEndDateTime: '2027-10-15T00:00:00.000Z' }));
    expect((multi as { about: Record<string, unknown> }).about.endDate).toBe('2027-10-14');
    const [timed] = pinJsonLd(pin({ ...place, categories: ['Sports'], allDay: false, utcStartDateTime: '2027-10-12T19:00:00.000Z' }));
    expect((timed as { about: Record<string, unknown> }).about).not.toHaveProperty('endDate');
  });

  it('carries the performers and the tickets read off the event pages', () => {
    const eventInfo = {
      performers: [{ name: 'Calvin Harris', type: 'Person' as const }],
      ticketUrl: 'https://www.ticketmaster.com.au/event/1',
      lowPrice: 99,
      highPrice: 250,
      priceCurrency: 'AUD',
      availability: 'InStock' as const,
      onSaleDate: null,
      source: 'markup' as const,
      sourceUrl: null,
      checkedAt: '2026-09-26T00:00:00.000Z',
    };
    const [article] = pinJsonLd(pin({ ...place, categories: ['Music'], allDay: false, price: 10, priceCurrency: 'USD' }), 'en', { eventInfo });
    const event = (article as { about: Record<string, unknown> }).about;
    expect(event.performer).toEqual([{ '@type': 'Person', name: 'Calvin Harris' }]);
    expect(event.offers).toEqual({
      '@type': 'AggregateOffer',
      url: 'https://www.ticketmaster.com.au/event/1',
      lowPrice: 99,
      highPrice: 250,
      priceCurrency: 'AUD',
      availability: 'https://schema.org/InStock',
    });
  });

  it("falls back to the pin's own price, and never assumes a currency", () => {
    const [priced] = pinJsonLd(pin({ ...place, categories: ['Sports'], price: 45, priceCurrency: 'GBP' }));
    expect((priced as { about: Record<string, unknown> }).about.offers).toMatchObject({ '@type': 'Offer', price: 45, priceCurrency: 'GBP' });
    const [bare] = pinJsonLd(pin({ ...place, categories: ['Sports'], price: 45 }));
    expect((bare as { about: Record<string, unknown> }).about).not.toHaveProperty('offers');
  });

  it('marks no event for a pin people cannot attend, and no critic reviews', () => {
    const [article] = pinJsonLd(
      pin({ ...place, categories: ['Anime'], ratings: [{ source: 'MyAnimeList', score: 8.5, scoreMax: 10 }] as PinJson['ratings'] }),
    );
    expect(article).not.toHaveProperty('about');
    expect(article).not.toHaveProperty('review');
  });
});
