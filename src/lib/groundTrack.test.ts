import { describe, expect, it } from 'vitest';
import { groundTrack } from './groundTrack';

const CAPE = { latitude: 28.5619, longitude: -80.5774 };
const VANDENBERG = { latitude: 34.632, longitude: -120.611 };

describe('groundTrack', () => {
  it('starts at the pad', () => {
    expect(groundTrack({ ...CAPE, inclination: 51.6 })[0]).toEqual([CAPE.latitude, CAPE.longitude]);
  });

  it('reaches the orbit inclination and no further north', () => {
    const lats = groundTrack({ ...CAPE, inclination: 51.6 }).map(([lat]) => lat);
    expect(Math.max(...lats)).toBeGreaterThan(50);
    expect(Math.max(...lats)).toBeLessThanOrEqual(51.6);
    expect(Math.min(...lats)).toBeLessThan(-50);
  });

  it('heads north from Florida and south from Vandenberg', () => {
    const north = groundTrack({ ...CAPE, inclination: 51.6 });
    expect(north[3][0]).toBeGreaterThan(north[0][0]);
    const south = groundTrack({ ...VANDENBERG, inclination: 97.5, southbound: true });
    expect(south[3][0]).toBeLessThan(south[0][0]);
  });

  it('runs east for a prograde orbit and west for a retrograde one', () => {
    const prograde = groundTrack({ ...CAPE, inclination: 51.6 });
    expect(prograde[6][1]).toBeGreaterThan(CAPE.longitude);
    const retrograde = groundTrack({ ...VANDENBERG, inclination: 97.5, southbound: true });
    expect(retrograde[6][1]).toBeLessThan(VANDENBERG.longitude);
  });

  it('never jumps more than a few degrees between samples', () => {
    for (const track of [
      groundTrack({ ...CAPE, inclination: 53 }),
      groundTrack({ ...VANDENBERG, inclination: 97.5, southbound: true }),
    ]) {
      for (let i = 1; i < track.length; i++) {
        expect(Math.abs(track[i][1] - track[i - 1][1])).toBeLessThan(20);
      }
    }
  });

  it('comes back near its start latitude after one orbit', () => {
    const track = groundTrack({ ...CAPE, inclination: 51.6, durationSeconds: 5700 });
    // ~93 minutes at 550 km; earth has turned ~23 degrees under it.
    expect(track.at(-1)![1]).toBeLessThan(CAPE.longitude - 10 + 360);
    expect(track.at(-1)![1]).toBeGreaterThan(-140);
  });
});
