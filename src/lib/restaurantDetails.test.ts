import { describe, expect, it } from 'vitest';
import profiles from '@/server/data/restaurantDetails.json';
import { restaurantDetailsFor, restaurantPhoneHref, restaurantOpenTableUrl } from './restaurantDetails';

describe('restaurant contact details', () => {
  it('uses verified booking listings and accepts stored OpenTable reservations', () => {
    expect(restaurantOpenTableUrl('https://serpentandstonesd.com/')).toBe('https://www.opentable.com/r/a-serpent-and-stone-san-diego');
    expect(restaurantOpenTableUrl(null, 'https://www.opentable.com/r/verified-location')).toBe('https://www.opentable.com/r/verified-location');
    expect(restaurantOpenTableUrl('https://www.windcriesmary.ca/')).toContain('https://www.opentable.ca/r/wind-cries-mary-reservations-victoria');
    expect(restaurantOpenTableUrl('https://www.northandnavy.com/')).toBe('https://www.opentable.ca/north-and-navy');
    expect(restaurantOpenTableUrl(null, 'https://opentable.ca.example.com/r/restaurant')).toBeNull();
    expect(restaurantOpenTableUrl(null, 'http://www.opentable.ca/r/restaurant')).toBeNull();
    expect(restaurantOpenTableUrl(null, 'https://opentable.com.example.com/r/restaurant')).toBeNull();
    expect(restaurantOpenTableUrl(null, 'https://www.exploretock.com/restaurant')).toBeNull();
    expect(restaurantOpenTableUrl('https://www.kinemusubi.com/')).toBeNull();
  });
  it('normalizes website variants while preserving location paths and anchors', () => {
    expect(restaurantDetailsFor('https://www.gable.la')?.phone).toBe('(323) 785-7000');
    expect(restaurantDetailsFor('https://www.elephanterestaurants.com/location/dallas')?.openingHours).toHaveLength(4);
    expect(restaurantDetailsFor('https://www.elephanterestaurants.com/location/scottsdale/')).toBeUndefined();
    expect(restaurantDetailsFor('https://www.trill-burgers.com/#another-location')).toBeUndefined();
    expect(restaurantDetailsFor(null)).toBeUndefined();
  });

  it('does not borrow hours or phone numbers from another branch', () => {
    const phoenix = restaurantDetailsFor('https://eggbred.com/#phoenix')!;
    expect(phoenix.phone).toBeNull();
    expect(phoenix.openingHours).toEqual([]);
    const woodlands = restaurantDetailsFor('https://www.barbludorn.com/#the-woodlands')!;
    expect(woodlands.phone).toBeNull();
    expect(woodlands.openingHours).toEqual([]);
  });

  it('keeps midnight closing times and service-specific schedules explicit', () => {
    expect(restaurantDetailsFor('https://amar-sa.com')?.openingHours).toContainEqual({ days: 'Friday–Saturday', hours: '11:00 AM–2:00 AM' });
    expect(restaurantDetailsFor('https://zenitarooftop.com')?.openingHours).toContainEqual({ days: 'Monday–Friday · breakfast', hours: '6:30–11:00 AM' });
    expect(restaurantPhoneHref('(415) 868-6274')).toBe('tel:4158686274');
    expect(restaurantPhoneHref('+1 (415) 868-6274')).toBe('tel:+14158686274');
  });

  it('requires provenance for populated contact and hours records', () => {
    expect(new Set(profiles.map((profile) => profile.pinSourceUrl)).size).toBe(profiles.length);
    for (const profile of profiles) {
      if (profile.websiteUrl) expect(new URL(profile.websiteUrl).protocol).toBe('https:');
      if (profile.phone || profile.openingHours.length) expect(new URL(profile.detailsSourceUrl!).protocol).toBe('https:');
      for (const entry of profile.openingHours) {
        expect(entry.days.trim()).not.toBe('');
        expect(entry.hours.trim()).not.toBe('');
      }
    }
  });

  it('retains booking-site provenance for details missing from operator pages', () => {
    const serpent = restaurantDetailsFor('https://serpentandstonesd.com/')!;
    expect(serpent.phone).toBe('(858) 421-8870');
    expect(serpent.openingHours).toEqual([{ days: 'Thursday–Saturday', hours: '5:00 PM–midnight' }]);
    expect(serpent.additionalSources).toContainEqual({ label: 'Phone & hours on OpenTable', url: 'https://www.opentable.com/r/a-serpent-and-stone-san-diego' });
    expect(serpent.detailsSourceUrl).toBe('https://serpentandstonesd.com/');
    // OpenTable publishes a placeholder for Bacanora, not a usable US number.
    expect(restaurantDetailsFor('https://guide.michelin.com/us/en/arizona/phoenix_2875757/restaurant/bacanora')?.phone).toBeNull();
  });
});
