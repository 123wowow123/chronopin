import { describe, expect, it } from 'vitest';
import { parseRestaurantContent } from './restaurantContentValidation';
import { legacyRestaurantContent } from '../../scripts/restaurants/seedContent';
const profiles = legacyRestaurantContent();
const mume = profiles.find((profile) => profile.tile?.name === 'MUME')!;
describe('restaurant content validation', () => {
  it('preserves every migrated menu, visit detail and tile', () => {
    for (const profile of profiles) expect(parseRestaurantContent({ profile }).profile).toEqual(profile);
  });
  it('rejects cross-branch menus, invalid prices and currency', () => {
    const profile = structuredClone(mume);
    profile.menu!.pinSourceUrl += '#other-branch';
    expect(() => parseRestaurantContent({ profile })).toThrow('same branch');
    profile.menu!.pinSourceUrl = profile.pinSourceUrl;
    profile.menu!.menus[0].items[0].price = -1;
    expect(() => parseRestaurantContent({ profile })).toThrow('price');
    profile.menu!.menus[0].items[0].price = 3980;
    profile.menu!.menus[0].currency = 'invalid';
    expect(() => parseRestaurantContent({ profile })).toThrow('currency');
  });
  it('requires photo credits, source evidence and Azure storage', () => {
    const profile = structuredClone(mume);
    profile.tile!.image = 'https://mume.tw/images/gallery/02.jpg';
    expect(() => parseRestaurantContent({ profile })).toThrow('Azure');
    profile.tile!.image = mume.tile!.image;
    profile.tile!.imageCredit = '';
    expect(() => parseRestaurantContent({ profile })).toThrow('credit');
  });
  it('rejects unsupported regions and impossible opening evidence dates', () => {
    const profile = structuredClone(mume);
    profile.tile!.regionSlug = 'made-up';
    expect(() => parseRestaurantContent({ profile })).toThrow('regionSlug');
    profile.tile!.regionSlug = 'taipei';
    profile.tile!.openingConfirmed = true;
    profile.tile!.day = '2026-02-30';
    expect(() => parseRestaurantContent({ profile })).toThrow('day');
  });
});
