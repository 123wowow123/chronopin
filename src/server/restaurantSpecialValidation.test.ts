import { describe, expect, it } from 'vitest';
import venues from '@/server/data/restaurantSpecials.json';
import menus from '@/server/data/restaurantMenus.json';
import { parseSpecialVenue, specialVenueRevision } from './restaurantSpecialValidation';

const input = () => { const { regionSlug, ...profile } = structuredClone(venues[0]); return { regionSlug, profile }; };
describe('restaurant special management validation', () => {
  it('preserves every existing offer and provenance field during import', () => {
    for (const { regionSlug, ...profile } of venues) expect(parseSpecialVenue({ regionSlug, profile }).profile).toEqual(profile);
    for (const profile of menus.filter((p) => p.specials.length)) expect(parseSpecialVenue({ profile }).profile).toEqual(profile);
  });
  it('rejects invalid source links, coordinates, ratings, and service windows', () => {
    const invalid = input(); invalid.profile.specials[0].sourceUrl = 'javascript:alert(1)';
    expect(() => parseSpecialVenue(invalid)).toThrow('Invalid special');
    const location = input(); location.profile.location.latitude = 91;
    expect(() => parseSpecialVenue(location)).toThrow('Invalid location');
    const review = input(); review.profile.review!.count = 2.5;
    expect(() => parseSpecialVenue(review)).toThrow('Invalid review evidence');
    const hours = input(); hours.profile.specials[0].availability!.windows[0].start = '25:00';
    expect(() => parseSpecialVenue(hours)).toThrow('Invalid service times');
    const days = input(); days.profile.specials[0].availability!.windows[0].days = [7];
    expect(() => parseSpecialVenue(days)).toThrow('Invalid service weekdays');
  });
  it('rejects impossible dates, reversed validity, and orphan menu labels', () => {
    const checked = input(); checked.profile.checkedAt = '2026-02-30';
    expect(() => parseSpecialVenue(checked)).toThrow('checkedAt');
    const dated = input(); Object.assign(dated.profile.specials[0], { validFrom: '2026-10-10', validThrough: '2026-10-01' });
    expect(() => parseSpecialVenue(dated)).toThrow('reversed');
    const menu = input(); Object.assign(menu.profile.specials[0], { menuLabel: 'No such menu' });
    expect(() => parseSpecialVenue(menu)).toThrow('menuLabel');
    expect(() => specialVenueRevision(undefined)).toThrow('current revision');
    expect(() => specialVenueRevision(0)).toThrow('current revision');
  });
});
