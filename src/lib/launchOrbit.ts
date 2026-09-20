// The orbit inclination a launch is going to, worked out from what a launch
// database gives: the mission name, the target orbit's name and the pad. The
// databases do not give inclination, so this is a rule of thumb (known
// constellation shells, the ISS, sun-synchronous and polar orbits); it returns
// null for anything it cannot place (geostationary transfers, lunar and deep
// space missions, unknown orbits), and those launches get no path.

export type LaunchOrbitInput = {
  mission: string;
  orbit: string | null | undefined;
  padLatitude: number;
};

export type LaunchOrbit = {
  inclination: number;
  // Vandenberg launches south over the Pacific; the others go north-east.
  southbound: boolean;
};

export function launchOrbit({ mission, orbit, padLatitude }: LaunchOrbitInput): LaunchOrbit | null {
  const inclination = inclinationFor(mission, orbit, padLatitude);
  if (inclination == null) return null;
  return { inclination, southbound: padLatitude > 33 && padLatitude < 36 };
}

function inclinationFor(mission: string, orbit: string | null | undefined, padLatitude: number): number | null {
  const name = mission.toLowerCase();
  const orbitName = (orbit || '').toLowerCase();
  const west = padLatitude > 33 && padLatitude < 36; // Vandenberg
  // Starship flies from south Texas to about 26 degrees.
  if (padLatitude > 25 && padLatitude < 27) return 26;
  if (/\b(crew-\d+|ax-\d+|axiom|crs-?\d*|cygnus|dragon|nasa.*iss)\b/.test(name)) return 51.6;
  if (orbitName.includes('sun-synchronous')) return 97.5;
  if (name.includes('starlink')) {
    // Group 15 is the 70-degree shell from California; the rest of California's
    // groups are 53, Florida's are 43 or 53 (53 is the bulk).
    if (west) return /group 15-/.test(name) ? 70 : 53;
    return 53;
  }
  if (name.includes('bandwagon')) return 45;
  if (orbitName.includes('polar')) return 90;
  if (orbitName.includes('low earth')) return west ? null : 53;
  return null;
}
