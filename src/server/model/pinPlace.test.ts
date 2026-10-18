import { describe, expect, it } from 'vitest';
import PinPlace from './pinPlace';

describe('PinPlace.problem', () => {
  it('accepts a row with any one handle', () => {
    expect(PinPlace.problem({ googlePlaceId: 'ChIJCar0f49ZwokR6ozLV-dHNTE' })).toBeNull();
    expect(PinPlace.problem({ yelpBusinessId: 'katzs-delicatessen-new-york' })).toBeNull();
    expect(PinPlace.problem({ reservationUrl: 'https://resy.com/cities/ny/venues/somewhere' })).toBeNull();
  });

  it('refuses a row with no handle at all - it could only cost a lookup', () => {
    expect(PinPlace.problem({})).toMatch(/needs a googlePlaceId/);
    expect(PinPlace.problem(null)).toMatch(/must be an object/);
  });

  it('refuses a booking link that is not https, so a pin cannot send anyone over http', () => {
    expect(PinPlace.problem({ reservationUrl: 'http://opentable.com/r/somewhere' })).toMatch(/https/);
  });

  it('refuses the wrong types and anything past the column width', () => {
    expect(PinPlace.problem({ googlePlaceId: 42 })).toMatch(/must be a string/);
    expect(PinPlace.problem({ googlePlaceId: 'x'.repeat(256) })).toMatch(/at most 255/);
    expect(PinPlace.problem({ reservationUrl: `https://x.com/${'y'.repeat(4000)}` })).toMatch(/at most 4000/);
  });
});

describe('PinPlace pinId', () => {
  it('reads through to the pin, so a place built before its pin picks up the new id', () => {
    const place = new PinPlace({ googlePlaceId: 'ChIJabc', pinId: 7 });
    expect(place.pinId).toBe(7);
    place.pinId = 9;
    expect(place.pinId).toBe(9);
  });

  it('leaves nulls out of its JSON, as the other pin models do', () => {
    const place = new PinPlace({ googlePlaceId: 'ChIJabc', yelpBusinessId: null, pinId: 3 });
    expect(place.toJSON()).toMatchObject({ googlePlaceId: 'ChIJabc' });
    expect(place.toJSON()).not.toHaveProperty('yelpBusinessId');
  });
});
