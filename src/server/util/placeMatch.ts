// Matching a pin's address against a place someone searched for - a city, a
// state, a postal code or a country.
//
// A pin has no geocoded city, state or postcode to compare against: its
// address is one line, written by whoever placed the pin, that names the
// place from the most particular part to the least ("Brooklyn Bridge, New
// York, NY, USA", "93 Quai d'Orsay, 75007 Paris, France"). So the line
// itself is what is searched, and a value matches when it stands as its own
// word or words anywhere in it - which keeps place:NY off Nyack, and finds
// place:Paris in "75007 Paris" and place:60601 in a postcode.

// A US state's name and its two-letter code. An address writes whichever its
// author reached for ("Newport, Rhode Island" but "Cupertino, CA 95014"), so
// a search for either has to find both.
const US_STATES: readonly (readonly [string, string])[] = [
  ['Alabama', 'AL'],
  ['Alaska', 'AK'],
  ['Arizona', 'AZ'],
  ['Arkansas', 'AR'],
  ['California', 'CA'],
  ['Colorado', 'CO'],
  ['Connecticut', 'CT'],
  ['Delaware', 'DE'],
  ['District of Columbia', 'DC'],
  ['Florida', 'FL'],
  ['Georgia', 'GA'],
  ['Hawaii', 'HI'],
  ['Idaho', 'ID'],
  ['Illinois', 'IL'],
  ['Indiana', 'IN'],
  ['Iowa', 'IA'],
  ['Kansas', 'KS'],
  ['Kentucky', 'KY'],
  ['Louisiana', 'LA'],
  ['Maine', 'ME'],
  ['Maryland', 'MD'],
  ['Massachusetts', 'MA'],
  ['Michigan', 'MI'],
  ['Minnesota', 'MN'],
  ['Mississippi', 'MS'],
  ['Missouri', 'MO'],
  ['Montana', 'MT'],
  ['Nebraska', 'NE'],
  ['Nevada', 'NV'],
  ['New Hampshire', 'NH'],
  ['New Jersey', 'NJ'],
  ['New Mexico', 'NM'],
  ['New York', 'NY'],
  ['North Carolina', 'NC'],
  ['North Dakota', 'ND'],
  ['Ohio', 'OH'],
  ['Oklahoma', 'OK'],
  ['Oregon', 'OR'],
  ['Pennsylvania', 'PA'],
  ['Rhode Island', 'RI'],
  ['South Carolina', 'SC'],
  ['South Dakota', 'SD'],
  ['Tennessee', 'TN'],
  ['Texas', 'TX'],
  ['Utah', 'UT'],
  ['Vermont', 'VT'],
  ['Virginia', 'VA'],
  ['Washington', 'WA'],
  ['West Virginia', 'WV'],
  ['Wisconsin', 'WI'],
  ['Wyoming', 'WY'],
];

// Every spelling of one searched place. A US state answers to its name and
// its code; anything else is only itself.
//
// Washington is both a state and a city (and D.C. is neither), so its code is
// left out of a search for the name: "Washington, D.C." would otherwise be
// every pin in Washington State, and WA still finds the state on its own.
export function placeNames(value: string): string[] {
  const place = value.trim();
  const lower = place.toLowerCase();
  const state = US_STATES.find(([name, code]) => lower === name.toLowerCase() || lower === code.toLowerCase());
  if (!state) return [place];
  const [name, code] = state;
  return lower === 'washington' ? [name] : [name, code];
}

// A Postgres regex (~*) matching the text as a whole word or words: the
// characters either side of it must not be letters or digits, so NY is not
// Nyack and 6060 is not the postcode 60601.
export function wholeWordPattern(text: string): string {
  const literal = text.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return `(^|[^[:alnum:]])${literal}([^[:alnum:]]|$)`;
}

// The patterns an address matches any of, for the places a query names.
export function placePatterns(values: string[]): string[] {
  return values.flatMap((value) => placeNames(value)).map(wholeWordPattern);
}

// Whether free text is worth looking for in an address at all: a letter or a
// digit to match on, and enough of it that a stray word is not every pin in
// a country ("a", "-").
export function looksLikePlaceText(text: string): boolean {
  const trimmed = text.trim();
  return trimmed.length >= 2 && /[\p{L}\p{N}]/u.test(trimmed);
}

// What an address match counts as against the search service's cosine scores,
// which top out around 0.7 for a one-word query. A pin actually standing in
// the place someone typed is as good a match as the best the text can offer,
// so it ranks with them rather than under the whole semantic pool.
export const PLACE_TEXT_SCORE = 0.7;
