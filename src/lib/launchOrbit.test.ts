import { describe, expect, it } from 'vitest';
import { launchOrbit } from './launchOrbit';

const CAPE = 28.56;
const VANDENBERG = 34.632;
const STARBASE = 25.997;

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
});
