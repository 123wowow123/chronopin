import { describe, expect, it } from 'vitest';
import { isLandingPath, isReload, landingReferrerPath, pinIdOfPath, referrerSource } from './landing';

describe('isLandingPath', () => {
  it('matches the restaurant guides only', () => {
    expect(isLandingPath('/restaurants')).toBe(true);
    expect(isLandingPath('/restaurants/san-jose')).toBe(true);
    expect(isLandingPath('/restaurantsx')).toBe(false);
    expect(isLandingPath('/tag/anime')).toBe(false);
  });
});

describe('referrerSource', () => {
  it('names the source of a visit', () => {
    expect(referrerSource(null, 'www.chronopin.com')).toBe('direct');
    expect(referrerSource('not a url', 'www.chronopin.com')).toBe('direct');
    expect(referrerSource('https://chronopin.com/pin/1', 'www.chronopin.com')).toBe('internal');
    expect(referrerSource('https://www.google.co.uk/', 'www.chronopin.com')).toBe('Google');
    expect(referrerSource('https://www.example.org/a', 'www.chronopin.com')).toBe('example.org');
  });
});

describe('landingReferrerPath', () => {
  const strip = (p: string) => p.replace(/^\/es(?=\/|$)/, '') || '/';
  it('is the landing page a pin was opened from', () => {
    expect(landingReferrerPath('https://www.chronopin.com/es/restaurants/san-jose/', 'chronopin.com', strip)).toBe('/restaurants/san-jose');
    expect(landingReferrerPath('https://www.chronopin.com/tag/anime', 'chronopin.com', strip)).toBeNull();
    expect(landingReferrerPath('https://evil.com/restaurants', 'chronopin.com', strip)).toBeNull();
    expect(landingReferrerPath(null, 'chronopin.com', strip)).toBeNull();
  });
});

describe('pinIdOfPath', () => {
  it('reads the id', () => {
    expect(pinIdOfPath('/pin/12/some-title')).toBe(12);
    expect(pinIdOfPath('/pin/12')).toBe(12);
    expect(pinIdOfPath('/map/pin/12')).toBeNull();
  });
});

describe('isReload', () => {
  it('spots a revalidating request', () => {
    expect(isReload('max-age=0', null)).toBe(true);
    expect(isReload('no-cache', 'no-cache')).toBe(true);
    expect(isReload(null, 'no-cache')).toBe(true);
    expect(isReload(null, null)).toBe(false);
    expect(isReload('max-age=3600', null)).toBe(false);
  });
});
