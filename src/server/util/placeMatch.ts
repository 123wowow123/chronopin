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

// Whether typed text is written in Chinese, Japanese or Korean.
export function isCjkText(text: string): boolean {
  return /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(text);
}

// Typed text as Postgres regexes (~*) a title must match all of: a whole word
// or words, as wholeWordPattern, except in Chinese, Japanese and Korean - there
// each space-separated word matches anywhere, in any order. Chinese and
// Japanese leave no space between words, and Korean runs nouns together
// (나이키 실적 finds "나이키 2025 회계연도 4분기 실적").
export function typedTextPatterns(text: string): string[] {
  if (isCjkText(text)) {
    return text.trim().split(/\s+/).map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  }
  return [wholeWordPattern(text)];
}

// Typed text as Postgres regexes (~*) a pin's own words must match all of:
// each typed word on its own, anywhere and in any order, starting a word and
// ending it or taking a plural (grammy finds "Grammys", and grammys "Grammy").
// Chinese, Japanese and Korean words match anywhere, as typedTextPatterns.
// Words with no letter or digit in them ("&", "-") are left out, and text
// with none left matches nothing - an empty list would match every pin.
export function typedWordPatterns(text: string): string[] {
  if (isCjkText(text)) return typedTextPatterns(text);
  return text
    .trim()
    .split(/\s+/)
    .filter((word) => /[\p{L}\p{N}]/u.test(word))
    .map((word) => {
      const stem = word.length >= 5 && /[^s]s$/i.test(word) ? word.slice(0, -1) : word;
      return `(^|[^[:alnum:]])${stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(s|es|'s)?([^[:alnum:]]|$)`;
    });
}

// The cosine score a free-text search's semantic match needs to stay in the
// results on its own once some pin holds the words typed. The search service
// ranks every pin, so its pool always runs to the full config.faiss.maxHits,
// and below this a hit is mostly noise: "grammy" pulled in anime premieres
// (0.547) and the iPhone 5S event (0.603) under its six Grammy pins, "hot
// flash" put Gemini Flash (0.619) over the hot-flash pills. Matches worth
// keeping that no word gives away score above it (Apollo's return to the Moon
// at 0.724 for "moon landing"). Text no pin holds keeps the whole pool.
export const SEMANTIC_ALONE_SCORE = 0.65;

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

// What a translated title holding every word of Chinese, Japanese or Korean
// text counts as: above any cosine score (they stay under 1), since what was
// typed is the pin's name as that language writes it (無職転生III ～異世界行ったら
// 本気だす～ scored 0.73 on unrelated pins, above the address score). The
// semantic score is added to order several such pins. Latin text keeps
// PLACE_TEXT_SCORE: an English word is in too many translated titles.
export const TITLE_TEXT_SCORE = 1;
