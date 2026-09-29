// One answer from the listing location's autocomplete
// (/api/place/autocomplete, src/server/placeSearch.ts).

export const PLACE_KINDS = ['address', 'street', 'place', 'neighborhood', 'postcode', 'city', 'county', 'region', 'country'] as const;
export type PlaceKind = (typeof PLACE_KINDS)[number];

export type PlaceSuggestion = {
  latitude: number;
  longitude: number;
  // What the listing keeps and shows: never finer than a neighbourhood.
  name: string;
  // The two lines the list shows: what was matched, and where it is.
  label: string;
  detail: string;
  kind: PlaceKind;
};
