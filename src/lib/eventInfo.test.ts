import { describe, expect, it } from 'vitest';
import { availabilityOf, eventInfoFromMarkup, findEventNode } from './eventInfo';

describe('availabilityOf', () => {
  it("maps schema.org's values onto Google's three, and drops the rest", () => {
    expect(availabilityOf('https://schema.org/InStock')).toBe('InStock');
    expect(availabilityOf('http://schema.org/LimitedAvailability')).toBe('InStock');
    expect(availabilityOf('SoldOut')).toBe('SoldOut');
    expect(availabilityOf('https://schema.org/PreSale')).toBe('PreOrder');
    expect(availabilityOf('https://schema.org/Discontinued')).toBeNull();
    expect(availabilityOf(undefined)).toBeNull();
  });
});

describe('eventInfoFromMarkup', () => {
  it('reads performers, a price range, the ticket link and whether it is on sale', () => {
    const info = eventInfoFromMarkup({
      '@type': 'MusicEvent',
      performer: [
        { '@type': 'MusicGroup', name: 'The Band', sameAs: 'https://en.wikipedia.org/wiki/The_Band' },
        { '@type': 'Person', name: 'A Singer' },
        { '@type': 'Person', name: 'a singer' },
      ],
      offers: [
        { '@type': 'Offer', price: '89.50', priceCurrency: 'aud', availability: 'https://schema.org/SoldOut', url: 'https://tickets.example/1' },
        { '@type': 'Offer', price: 249, priceCurrency: 'AUD', availability: 'https://schema.org/InStock' },
      ],
    });
    expect(info.performers).toEqual([
      { name: 'The Band', type: 'PerformingGroup', url: 'https://en.wikipedia.org/wiki/The_Band' },
      { name: 'A Singer', type: 'Person' },
    ]);
    expect(info).toMatchObject({ lowPrice: 89.5, highPrice: 249, priceCurrency: 'AUD', availability: 'InStock', ticketUrl: 'https://tickets.example/1' });
  });

  it('calls it sold out only when every offer is, and keeps the on-sale date of a pre-sale', () => {
    expect(eventInfoFromMarkup({ offers: [{ availability: 'SoldOut' }, { availability: 'SoldOut' }] }).availability).toBe('SoldOut');
    const pre = eventInfoFromMarkup({ offers: { '@type': 'AggregateOffer', lowPrice: '1,999', availability: 'PreOrder', validFrom: '2027-01-10T10:00:00-08:00' } });
    expect(pre).toMatchObject({ lowPrice: 1999, availability: 'PreOrder', onSaleDate: '2027-01-10T18:00:00.000Z' });
  });

  it('leaves out a price it cannot read, and a currency with no price', () => {
    const info = eventInfoFromMarkup({ offers: { price: 'TBA', priceCurrency: 'USD' } });
    expect(info.lowPrice).toBeNull();
    expect(info.priceCurrency).toBeNull();
  });
});

describe('findEventNode', () => {
  const pin = { utcStartDateTime: '2027-02-20T08:00:00.000Z' };

  it("finds the Event on the pin's day, including one inside a @graph", () => {
    expect(findEventNode([{ '@type': 'WebPage' }, { '@graph': [{ '@type': 'Organization' }, { '@type': 'SportsEvent', name: 'Final', startDate: '2027-02-20' }] }], pin)).toMatchObject({ name: 'Final' });
    expect(findEventNode([{ '@type': 'Article' }], pin)).toBeUndefined();
  });

  it("skips a tour's other nights, last year's edition and an undated Event", () => {
    const tour = [
      { '@type': 'MusicEvent', name: 'Perth', startDate: '2027-02-17T19:00:00+08:00' },
      { '@type': 'MusicEvent', name: 'Brisbane', startDate: '2027-02-19T19:00:00+10:00' },
      { '@type': 'MusicEvent', name: 'Sydney', startDate: '2027-02-20T19:00:00+11:00' },
    ];
    expect(findEventNode(tour, pin)).toMatchObject({ name: 'Sydney' });
    expect(findEventNode(tour.slice(0, 2), pin)).toBeUndefined();
    // Days alone: the pin's own day beats the night before.
    const days = [
      { '@type': 'MusicEvent', name: 'Brisbane', startDate: '2027-02-19' },
      { '@type': 'MusicEvent', name: 'Sydney', startDate: '2027-02-20' },
    ];
    expect(findEventNode(days, pin)).toMatchObject({ name: 'Sydney' });
    expect(findEventNode([{ '@type': 'Event', name: 'Anime Expo 2026', startDate: '2026-07-02' }], { utcStartDateTime: '2027-07-02T00:00:00.000Z' })).toBeUndefined();
    expect(findEventNode([{ '@type': 'Event', name: 'Undated' }], pin)).toBeUndefined();
  });

  it('takes any day of a multi-day pin', () => {
    const conference = { utcStartDateTime: '2027-09-21T00:00:00.000Z', utcEndDateTime: '2027-09-24T00:00:00.000Z', allDay: true };
    expect(findEventNode([{ '@type': 'BusinessEvent', startDate: '2027-09-23' }], conference)).toBeDefined();
    expect(findEventNode([{ '@type': 'BusinessEvent', startDate: '2027-09-24' }], conference)).toBeUndefined();
  });
});

describe('performers that are the event itself', () => {
  it('drops the event or its organizer named as a performer, and keeps a headliner named in the event', () => {
    expect(eventInfoFromMarkup({ name: 'Anime Expo 2026', organizer: 'Anime Expo', performer: { '@type': 'PerformingGroup', name: 'Anime Expo' } }).performers).toEqual([]);
    expect(eventInfoFromMarkup({ name: 'Calvin Harris Australia Tour 2027 - Sydney', performer: { '@type': 'MusicGroup', name: 'Calvin Harris' } }).performers).toEqual([
      { name: 'Calvin Harris', type: 'PerformingGroup' },
    ]);
  });
});
