// Splits a search box query into the structured terms a pin card's labels add
// and whatever free text is left over:
//
//   user:ThePinGang company:"Electronic Arts" tag:Software iphone
//
// tag: takes one of a pin's tags, as the tag cloud and the pin page write it
// (tag:"Tokyo Anime Award Festival 2024"): what it was tagged with, the
// awards its text names, or an award body's year its work was up for. A
// pin's categories are tags too (0043), so tag:Anime finds the anime; the old
// category:Anime still works and means the same.
//
// confidence: takes a pin's date confidence level, as its badge shows it
// (confidence:estimated); UNVERIFIED is the badge for the stored "unknown", so
// either word works. It also takes how well the pin is evidenced overall, as
// a band of its score: confidence:low (under 50%, what the pin page flags
// "Low confidence"), confidence:medium or confidence:high. Every score badge
// on a pin or a card links to its own band; a pin with no score at all is in
// no band.
//
// date: takes a day as the timeline writes it (date:2026-09-08, or
// date:-2560-01-01 for 2561 BC): the pins starting that day as the timeline
// places them - an all-day pin on its own date, a timed one on its date in
// the viewer's time zone. A day's "View all" popup and a card's start date
// link to one. posted: takes a day the same way, for the pins posted that day
// in the viewer's time zone; a card's posted date links to one.
//
// place: takes anywhere a pin's address names - a city, a state, a postal
// code, a country (place:Chicago, place:60601, place:Texas, place:"New
// York"). The address is one label written by whoever placed the pin
// ("Brooklyn Bridge, New York, NY, USA"), so a value matches when it stands
// as its own word or words anywhere in that line; US states match under
// either their name or their two-letter code, whichever the address used.
// A card's place label and the pin page's write one.
//
// user: takes a name with or without its "@" (user:@ThePinGang), and a bare
// @ThePinGang still works on its own, as it did before user: existed.
//
// pin: takes pin ids, comma-separated (pin:1992,1991,1987): exactly those
// pins and no others. Nothing in the site writes one by hand - it is how a
// batch of notifications links to the pins it stands for, which no day or
// author term can name exactly. The search box shows it as "3 pins".
//
// A value with spaces is quoted, as the labels write it. Several values for
// one field widen the search (either company), while different fields narrow
// it (this company and this tag), so each click on a label is additive.
//
// Quoting is forgiving, since people type these too:
//   company:"Electronic Arts"    the form the labels write
//   company:'Electronic Arts'    single quotes work the same way
//   "company:Electronic Arts"    the whole term quoted, with either kind
//   company:“Electronic Arts”    smart quotes, which Mac and iOS keyboards
//                                substitute as you type
//   company:"Electronic Arts     unclosed - the value runs to the end, so a
//                                query mid-edit still means what it says
//
// No name contains a double quote, so one always delimits. A single quote is
// also an apostrophe (McDonald's), so it only closes a value when a space or
// the end of the query follows it: company:'McDonald's' is one company.

import { type ConfidenceBand, isConfidenceBand } from '@/lib/referenceConfidence';

export type SearchQuery = {
  userNames: string[];
  // Pin ids, matching exactly those pins.
  ids: number[];
  companies: string[];
  confidences: string[];
  // Bands of a pin's overall score ("low", "medium", "high"), which widen the
  // same confidence: field the levels do.
  confidenceBands: ConfidenceBand[];
  // Day keys ("2026-09-08"), any of them: when pins start, and when they
  // were posted.
  dates: string[];
  postedDays: string[];
  tags: string[];
  // Tags a pin must not carry (-tag:Anime), matched as tags: are.
  excludeTags: string[];
  // Places an address must name: cities, states, postal codes, countries.
  places: string[];
  text: string;
};

const SMART_DOUBLE_QUOTES = /[“”„‟″]/g;
const SMART_SINGLE_QUOTES = /[‘’‚‛′]/g;

// A leading "-" leaves out what the term would match (-tag:Anime); only tags
// read it so far, and any other field written that way is left out.
const FIELD = '(-?(?:company|category|user|confidence|date|posted|tag|pin|place))';
const DAY_KEY = /^-?\d{4,6}-\d{2}-\d{2}$/;
const DOUBLE_QUOTED = '([^"]*)"?';
const SINGLE_QUOTED = "((?:[^']|'(?!\\s|$))*)'?";

const FIELD_TERM = new RegExp(
  '(^|\\s)(?:' +
    [
      `"${FIELD}:${DOUBLE_QUOTED}`, // "company:Electronic Arts"
      `'${FIELD}:${SINGLE_QUOTED}`, // 'company:Electronic Arts'
      `${FIELD}:"${DOUBLE_QUOTED}`, // company:"Electronic Arts"
      `${FIELD}:'${SINGLE_QUOTED}`, // company:'Electronic Arts'
      `${FIELD}:([^\\s"']\\S*)`, // company:Apple, company:McDonald's
    ].join('|') +
    ')',
  'gi',
);

const USER_TERM = /(^|\s)(@\S+)/g;

export type TermField = 'user' | 'company' | 'category' | 'confidence' | 'date' | 'posted' | 'tag' | 'pin' | 'place';

export type QueryPart =
  | { kind: 'term'; field: TermField; value: string; raw: string; negated?: boolean }
  | { kind: 'text'; raw: string };

// The query in order: its label terms and the free text around them, each
// with the text it was written as. parseSearchQuery reads these, and the
// search box shows the terms as pills, so the two always agree.
export function splitSearchQuery(searchText: string | null | undefined): QueryPart[] {
  const normalized = String(searchText || '')
    .replace(SMART_DOUBLE_QUOTES, '"')
    .replace(SMART_SINGLE_QUOTES, "'");
  const parts: QueryPart[] = [];

  // A bare @name is only a term in the text the field terms leave, as a
  // user:@name value is theirs.
  const addText = (text: string) => {
    let from = 0;
    for (const match of text.matchAll(USER_TERM)) {
      const start = match.index + match[1].length;
      if (start > from) parts.push({ kind: 'text', raw: text.slice(from, start) });
      parts.push({ kind: 'term', field: 'user', value: match[2], raw: match[2] });
      from = start + match[2].length;
    }
    if (from < text.length) parts.push({ kind: 'text', raw: text.slice(from) });
  };

  let from = 0;
  for (const match of normalized.matchAll(FIELD_TERM)) {
    const start = match.index + match[1].length;
    addText(normalized.slice(from, start));
    // Each alternative captures a (field, value) pair; exactly one matched.
    const groups = match.slice(2);
    const at = groups.findIndex((group, index) => index % 2 === 0 && group !== undefined);
    const written = groups[at]!.toLowerCase();
    const negated = written.startsWith('-');
    const field = written.replace(/^-/, '') as TermField;
    parts.push({ kind: 'term', field, value: groups[at + 1]!.trim(), raw: match[0].slice(match[1].length), ...(negated ? { negated } : {}) });
    from = match.index + match[0].length;
  }
  addText(normalized.slice(from));
  return parts;
}

// The query written back from its parts, less any left out.
export function joinSearchQuery(parts: QueryPart[]): string {
  return parts
    .map((part) => part.raw)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseSearchQuery(searchText: string | null | undefined): SearchQuery {
  const query: SearchQuery = {
    userNames: [],
    ids: [],
    companies: [],
    confidences: [],
    confidenceBands: [],
    dates: [],
    postedDays: [],
    tags: [],
    excludeTags: [],
    places: [],
    text: '',
  };

  const text: string[] = [];
  for (const part of splitSearchQuery(searchText)) {
    if (part.kind === 'text') {
      text.push(part.raw);
    } else if (part.negated) {
      // category: is the old name for a category's tag.
      if ((part.field === 'tag' || part.field === 'category') && part.value) addUnique(query.excludeTags, part.value);
    } else if (part.field === 'user') {
      addUserName(query, part.value);
    } else if (part.field === 'confidence') {
      addConfidence(query, part.value);
    } else if (part.field === 'pin') {
      // Anything that is not a pin id is left out rather than matching nothing.
      for (const id of part.value.split(',')) {
        const n = Number(id.trim());
        if (Number.isInteger(n) && n > 0 && !query.ids.includes(n)) query.ids.push(n);
      }
    } else if (part.field === 'date' || part.field === 'posted') {
      // Anything but a day is left out rather than matching nothing.
      if (DAY_KEY.test(part.value)) addUnique(part.field === 'date' ? query.dates : query.postedDays, part.value);
    } else if (part.field === 'place') {
      addUnique(query.places, part.value);
    } else if (part.value) {
      // category: is the old name for a category's tag.
      addUnique(part.field === 'company' ? query.companies : query.tags, part.value);
    }
  }

  query.text = text.join(' ').replace(/\s+/g, ' ').trim();
  return query;
}

export function hasFilters(query: SearchQuery): boolean {
  return !!(
    query.userNames.length ||
    query.ids.length ||
    query.companies.length ||
    query.confidences.length ||
    query.confidenceBands.length ||
    query.dates.length ||
    query.postedDays.length ||
    query.tags.length ||
    query.excludeTags.length ||
    query.places.length
  );
}

// Whether the viewer's time zone changes what the query matches: its days are
// the viewer's own. Everything else answers the same everywhere, so it can be
// cached once for all zones.
export function dependsOnZone(query: SearchQuery): boolean {
  return !!(query.dates.length || query.postedDays.length);
}

// User names are stored with their "@", so that is the form matched on.
function addUserName(query: SearchQuery, value: string) {
  const name = value.replace(/^@+/, '').trim();
  if (name) {
    addUnique(query.userNames, `@${name}`);
  }
}

// A score band, or else a level. Levels are stored lowercase; UNVERIFIED is
// how the badge shows "unknown".
function addConfidence(query: SearchQuery, value: string) {
  const level = value.trim().toLowerCase();
  if (!level) {
    return;
  }
  if (isConfidenceBand(level)) {
    if (!query.confidenceBands.includes(level)) query.confidenceBands.push(level);
  } else {
    addUnique(query.confidences, level === 'unverified' ? 'unknown' : level);
  }
}

function addUnique(list: string[], value: string) {
  const lower = value.toLowerCase();
  if (!list.some((existing) => existing.toLowerCase() === lower)) {
    list.push(value);
  }
}

// A Postgres regex (~*) matching text at the start of any word, the text taken literally.
export function wordStartPattern(text: string): string {
  return `(^|[^[:alnum:]])${text.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`;
}
