// A user's default location (0066): where distances are measured from, the
// bell's weather is for and the map opens on when the browser gives no
// position of its own. Set on the profile, from the device or a place picked
// from a search, and kept up to date from the device while that is allowed.
// The profile and the device check it before sending; the API checks again.

import { distanceKm } from './distance';

export type UserLocation = {
  latitude: number;
  longitude: number;
  // The geocoder's name for the point; null when it could name nothing.
  name: string | null;
};

// The column's ceiling (0066).
export const LOCATION_NAME_MAX = 200;

// How far the device has to be from the saved point before the saved point
// follows it: far enough that GPS jitter and a walk across town never write.
export const MOVED_KM = 5;

// Two decimals, about a kilometre: no finer position than this is sent or
// kept, the same rounding the distance and weather lookups use.
export function roundCoordinate(value: number): number {
  return Math.round(value * 100) / 100;
}

export type LocationProblem = 'latitude' | 'longitude' | 'name';

// undefined when the point may be saved.
export function locationProblem(location: { latitude?: unknown; longitude?: unknown; name?: unknown }): LocationProblem | undefined {
  const { latitude, longitude, name } = location;
  if (typeof latitude !== 'number' || !Number.isFinite(latitude) || latitude < -90 || latitude > 90) return 'latitude';
  if (typeof longitude !== 'number' || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) return 'longitude';
  if (name != null && (typeof name !== 'string' || name.trim().length > LOCATION_NAME_MAX)) return 'name';
  return undefined;
}

// What an API client is told, in English.
export function locationMessage(problem: LocationProblem): string {
  return problem === 'name'
    ? `location.name must be a string of at most ${LOCATION_NAME_MAX} characters.`
    : `location.${problem} must be a number in range (latitude -90 to 90, longitude -180 to 180).`;
}

// The saved location a user record carries, or null when none is set.
export function userLocation(user: { locationLatitude?: number | null; locationLongitude?: number | null; locationName?: string | null } | null | undefined): UserLocation | null {
  if (user?.locationLatitude == null || user.locationLongitude == null) return null;
  return { latitude: user.locationLatitude, longitude: user.locationLongitude, name: user.locationName ?? null };
}

// Whether the device's position is far enough from the saved one to move it.
export function hasMoved(saved: { latitude: number; longitude: number } | null, now: { latitude: number; longitude: number }): boolean {
  return !saved || distanceKm(saved, now) >= MOVED_KM;
}
