// An estimated ground track for a launch: where the point below a rocket goes
// over its first orbit. It is a circular two-body orbit at the target
// inclination with the Earth turning beneath it, plus a slower first ~9
// minutes for the powered ascent. That is close enough to see the shape of a
// flight on a map (a Starlink shell, a polar pass), not a trajectory: a real
// simulation, like Flight Club's, knows the burn profile and we do not.

const MU = 398600.4418; // km^3/s^2, Earth's gravitational parameter
const EARTH_RADIUS_KM = 6371;
const EARTH_TURN = (2 * Math.PI) / 86164.1; // rad/s, one sidereal day
const ASCENT_SECONDS = 540;
// Over the ascent the vehicle covers this share of the ground an orbiting
// object would: it is still climbing and not yet at orbital speed.
const ASCENT_PACE = 0.45;

const rad = (degrees: number) => (degrees * Math.PI) / 180;
const deg = (radians: number) => (radians * 180) / Math.PI;

export type GroundTrackInput = {
  latitude: number;
  longitude: number;
  // Orbit inclination, degrees: above 90 is retrograde (sun-synchronous ~97).
  inclination: number;
  // Launches heading south cross the equator descending (Vandenberg does).
  southbound?: boolean;
  altitudeKm?: number;
  durationSeconds?: number;
  stepSeconds?: number;
};

// [latitude, longitude] pairs from the pad on. Longitudes are continuous,
// not wrapped to +-180, so a line drawn through them never jumps across the
// map; they leave the range when the track crosses the date line.
export function groundTrack({
  latitude,
  longitude,
  inclination,
  southbound = false,
  altitudeKm = 550,
  durationSeconds = 5400,
  stepSeconds = 30,
}: GroundTrackInput): [number, number][] {
  const lat0 = rad(latitude);
  const inc = rad(inclination);
  // An orbit only reaches latitudes up to min(i, 180 - i); a pad beyond that
  // cannot launch to it, so the launch is clamped to the orbit's edge.
  const sinInc = Math.sin(inc);
  const ratio = Math.max(-1, Math.min(1, Math.sin(lat0) / sinInc));
  const u0 = southbound ? Math.PI - Math.asin(ratio) : Math.asin(ratio);
  const meanMotion = Math.sqrt(MU / (EARTH_RADIUS_KM + altitudeKm) ** 3); // rad/s
  // Longitude of a point on the orbit, measured from the ascending node.
  const nodeLongitude = (u: number) => Math.atan2(Math.cos(inc) * Math.sin(u), Math.cos(u));

  const points: [number, number][] = [];
  let previous = longitude;
  for (let t = 0; t <= durationSeconds; t += stepSeconds) {
    const flown = t - (1 - ASCENT_PACE) * Math.min(t, ASCENT_SECONDS);
    const u = u0 + meanMotion * flown;
    const lat = deg(Math.asin(Math.max(-1, Math.min(1, sinInc * Math.sin(u)))));
    // The node-relative longitude jumps by 2*pi where atan2 wraps; taking each
    // step's change modulo a turn keeps the running longitude continuous.
    const raw = deg(nodeLongitude(u) - nodeLongitude(u0) - EARTH_TURN * t) + longitude;
    let lon = raw;
    while (lon - previous > 180) lon -= 360;
    while (lon - previous < -180) lon += 360;
    previous = lon;
    points.push([round(t === 0 ? latitude : lat), round(t === 0 ? longitude : lon)]);
  }
  return points;
}

const round = (value: number) => Math.round(value * 10000) / 10000;
