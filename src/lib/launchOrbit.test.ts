import { describe, expect, it } from 'vitest';
import { launchOrbit } from './launchOrbit';

const CAPE = 28.56;
const VANDENBERG = 34.632;
const STARBASE = 25.997;
const BAIKONUR = 45.996;
const WENCHANG = 19.614;

describe('launchOrbit', () => {
  it('places a crew flight on the ISS orbit', () => {
    expect(launchOrbit({ mission: 'Crew-13', orbit: 'Low Earth Orbit', padLatitude: CAPE })).toEqual({ inclination: 51.6, southbound: false });
  });

  it('sends Vandenberg launches south', () => {
    expect(launchOrbit({ mission: 'Transporter 18', orbit: 'Sun-Synchronous Orbit', padLatitude: VANDENBERG })).toEqual({ inclination: 97.5, southbound: true });
  });

  it('knows the 70-degree Starlink group', () => {
    expect(launchOrbit({ mission: 'Starlink Group 15-27', orbit: 'Low Earth Orbit', padLatitude: VANDENBERG })?.inclination).toBe(70);
    expect(launchOrbit({ mission: 'Starlink Group 6-99', orbit: 'Low Earth Orbit', padLatitude: CAPE })?.inclination).toBe(53);
  });

  it('flies Starship at 26 degrees', () => {
    expect(launchOrbit({ mission: 'Starlink Group 31-1 (Starship Flight 14)', orbit: 'Low Earth Orbit', padLatitude: STARBASE })?.inclination).toBe(26);
  });

  it('gives up on orbits it cannot place', () => {
    expect(launchOrbit({ mission: 'NROL-97', orbit: 'Unknown', padLatitude: CAPE })).toBeNull();
    expect(launchOrbit({ mission: 'Griffin Mission One', orbit: 'Lunar Orbit', padLatitude: CAPE })).toBeNull();
    expect(launchOrbit({ mission: 'A payload', orbit: 'Low Earth Orbit', padLatitude: VANDENBERG })).toBeNull();
  });

  it('flies every station visitor on its station\'s orbit, whoever launched it', () => {
    expect(launchOrbit({ mission: 'Progress MS-36 (97P)', orbit: 'Low Earth Orbit', padLatitude: BAIKONUR })?.inclination).toBe(51.6);
    expect(launchOrbit({ mission: 'Soyuz MS-31', orbit: 'Low Earth Orbit', padLatitude: BAIKONUR })?.inclination).toBe(51.6);
    expect(launchOrbit({ mission: 'Tianzhou 10', orbit: 'Low Earth Orbit', padLatitude: WENCHANG })?.inclination).toBe(41.5);
  });

  it('refuses an inclination its pad cannot reach', () => {
    // The bare "low earth orbit" guess of 53 is below Baikonur's latitude only
    // for a pad further north, so check the rule where it bites.
    expect(launchOrbit({ mission: 'An unnamed payload', orbit: 'Low Earth Orbit', padLatitude: 62.93 })).toBeNull();
  });
});
