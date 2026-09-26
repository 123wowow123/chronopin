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

import { US_STATES } from '@/lib/usStates';

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

// Typed text as a Postgres regex (~*) for a title: a whole word or words, as
// wholeWordPattern, except in Chinese and Japanese, which leave no space
// between words - there it matches anywhere.
export function typedTextPattern(text: string): string {
  if (/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(text)) {
    return text.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  return wholeWordPattern(text);
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
