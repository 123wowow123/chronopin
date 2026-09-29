import { describe, expect, it } from 'vitest';
import { busyLabel, busyPercent, hasPlace, ratingOutOf, waitLabel, type PlaceBusyJson } from './places';
import type { Translator } from './i18n/translate';

// The panel only needs the key back to prove it picked the right message.
const t = ((key: string, params?: Record<string, unknown>) =>
  params ? `${key}:${JSON.stringify(params)}` : key) as unknown as Translator;

describe('hasPlace', () => {
  it('is true for any one handle, so a pin with only a booking link still shows', () => {
    expect(hasPlace({ googlePlaceId: 'ChIJabc' })).toBe(true);
    expect(hasPlace({ yelpBusinessId: 'katzs-delicatessen-new-york' })).toBe(true);
    expect(hasPlace({ reservationUrl: 'https://resy.com/cities/ny/venue' })).toBe(true);
  });

  it('is false for no place at all, which is most pins', () => {
    expect(hasPlace(null)).toBe(false);
    expect(hasPlace(undefined)).toBe(false);
    expect(hasPlace({})).toBe(false);
    expect(hasPlace({ googlePlaceId: null, yelpBusinessId: null, reservationUrl: null })).toBe(false);
  });
});

describe('ratingOutOf', () => {
  it('keeps the decimal, so a 4.0 does not read as a 4', () => {
    expect(ratingOutOf({ source: 'Google', rating: 4, ratingMax: 5, count: 10, url: null })).toBe('4.0');
    expect(ratingOutOf({ source: 'Yelp', rating: 4.45, ratingMax: 5, count: 10, url: null })).toBe('4.5');
  });
});

describe('busyLabel', () => {
  const busy = (over: Partial<PlaceBusyJson>): PlaceBusyJson => ({
    live: null,
    typical: null,
    waitMinutes: null,
    trend: null,
    ...over,
  });

  it('prefers the words Google itself used over the bare number', () => {
    expect(busyLabel(busy({ trend: 'more', live: 80 }), t)).toBe('place.busy.more');
    expect(busyLabel(busy({ trend: 'much-less' }), t)).toBe('place.busy.muchLess');
  });

  it('falls back to the live percentage when there is no wording', () => {
    expect(busyLabel(busy({ live: 45 }), t)).toBe('place.busy.percent:{"percent":45}');
  });

  it('says nothing when busyness said nothing, which is the usual case', () => {
    expect(busyLabel(null, t)).toBeNull();
    expect(busyLabel(busy({ typical: 60 }), t)).toBeNull();
  });
});

describe('waitLabel', () => {
  it('only speaks when Google printed a wait', () => {
    expect(waitLabel({ live: null, typical: null, waitMinutes: 25, trend: null }, t)).toBe(
      'place.busy.wait:{"minutes":25}',
    );
    expect(waitLabel({ live: 90, typical: 50, waitMinutes: null, trend: 'more' }, t)).toBeNull();
    expect(waitLabel(null, t)).toBeNull();
  });
});

describe('busyPercent', () => {
  it('shows the live reading, falling back to what the hour is normally like', () => {
    expect(busyPercent({ live: 40, typical: 70, waitMinutes: null, trend: null })).toBe(40);
    expect(busyPercent({ live: null, typical: 70, waitMinutes: null, trend: null })).toBe(70);
    expect(busyPercent({ live: null, typical: null, waitMinutes: 10, trend: null })).toBeNull();
  });

  it('clamps, so a bar can never run past its track', () => {
    expect(busyPercent({ live: 140, typical: null, waitMinutes: null, trend: null })).toBe(100);
    expect(busyPercent({ live: -5, typical: null, waitMinutes: null, trend: null })).toBe(0);
  });
});
