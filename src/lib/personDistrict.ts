// A member of Congress's seat on a map: GeoJSON polygons plus where they came from.

export type PersonDistrictJson = {
  label: string;
  geojson: { type: 'FeatureCollection'; features: { type: 'Feature'; properties: Record<string, unknown>; geometry: { type: string; coordinates: unknown } }[] };
  vintage: string;
  source: string;
  sourceUrl: string;
};

// "United States Representative from Florida's 28th congressional district"
// -> { state: 'Florida', district: 28 }; "... Wyoming's at-large" -> district
// null for a House seat, and a Senator has no number either (house: false).
// A trailing "(Chair, ...)" is ignored. Null for any other office (a leader's
// title, a delegate, a cabinet post).
export function seatOf(office: string | null): { state: string; district: number | null; house: boolean } | null {
  if (!office) return null;
  const house = /^(?:United States|U\.S\.) Representative (?:from|for) ([A-Za-z .]+?)'s (?:(\d+)(?:st|nd|rd|th)(?: congressional)? district|at-large)/.exec(office.trim());
  if (house) return { state: house[1], district: house[2] ? Number(house[2]) : null, house: true };
  const senate = /^United States Senator from ([A-Za-z .]+?)(?: \(|$)/.exec(office.trim());
  if (senate) return { state: senate[1], district: null, house: false };
  return null;
}
