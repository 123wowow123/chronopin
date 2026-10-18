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
  // A launch cannot reach an inclination below its pad's latitude without a
  // dog-leg, so a guess under it would draw a track the rocket cannot fly.
  // Only the guesses can fall foul of this; the named orbits are all above it.
  if (inclination < Math.abs(padLatitude)) return null;
  return { inclination, southbound: padLatitude > 33 && padLatitude < 36 };
}

function inclinationFor(mission: string, orbit: string | null | undefined, padLatitude: number): number | null {
  const name = mission.toLowerCase();
  const orbitName = (orbit || '').toLowerCase();
  const west = padLatitude > 33 && padLatitude < 36; // Vandenberg
  // Starship flies from south Texas to about 26 degrees.
  if (padLatitude > 25 && padLatitude < 27) return 26;
  // Everything that visits the ISS flies its 51.6-degree orbit, whoever
  // launched it; Tiangong's visitors fly China's 41.5-degree equivalent.
  if (/\b(crew-\d+|ax-\d+|axiom|crs-?\d*|cygnus|dragon|nasa.*iss|progress ms-\d+|soyuz ms-\d+|htv|h-?ii ?tv)\b/.test(name)) return 51.6;
  if (/\b(shenzhou|tianzhou)\b/.test(name)) return 41.5;
  if (orbitName.includes('sun-synchronous')) return 97.5;
  if (name.includes('starlink')) {
    // Group 15 is the 70-degree shell from California; the rest of California's
    // groups are 53, Florida's are 43 or 53 (53 is the bulk).
    if (west) return /group 15-/.test(name) ? 70 : 53;
    return 53;
  }
  if (name.includes('bandwagon')) return 45;
  if (orbitName.includes('polar')) return 90;
  // A bare "low earth orbit" says almost nothing. 53 is a fair guess for a
  // Florida launch, where the busy shells sit; from Vandenberg, or from a pad
  // whose latitude rules 53 out, there is nothing to go on and the launch gets
  // no path rather than an invented one.
  if (orbitName.includes('low earth')) return west ? null : 53;
  return null;
}
