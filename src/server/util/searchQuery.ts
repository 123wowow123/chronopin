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
// in the viewer's time zone; a card's posted date and its NEW pill link to one.
// updated: takes a day the same way, for the pins with an update (PinUpdate,
// 0081: an edit, a newer reference or duplicate, an article rewrite) that day;
// a card's UPDATED pill links to updated:>= the day 24 hours back.
//
// Both also take the comparisons rating: and delay: do, on days: date:>=2026-09-01
// (that day or later), date:>2026-09-01 (after it), date:<2026-10-01 (before),
// date:<=2026-10-01 (that day or earlier) and a range with both ends in,
// date:2026-09-01..2026-09-30 (".." since a day's own dashes, and a BC year's
// leading one, leave "-" no room). posted:>=2026-09-01 and updated:>=2026-09-01
// read the same. A day
// with "=" (date:=2026-09-08) is a bare day. Exact days widen each other as
// before; the comparisons narrow, so date:>=2026-09-01 date:<2026-10-01 is a
// month, and a day or two alongside narrows to the ones inside it. A bound
// reads days as an exact one does: all-day pins by UTC date, timed ones by the
// viewer's.
//
// place: takes anywhere a pin's address names - a city, a state, a postal
// code, a country (place:Chicago, place:60601, place:Texas, place:"New
// York"). The address is one label written by whoever placed the pin
// ("Brooklyn Bridge, New York, NY, USA"), so a value matches when it stands
// as its own word or words anywhere in that line; US states match under
// either their name or their two-letter code, whichever the address used.
// A card's place label and the pin page's write one.
//
// rating: takes a bound on a pin's rating as a percentage - the headline
// number its card shows: the average of its review scores, each rescaled to
// a percentage of its own maximum (MyAnimeList's 8.2/10 is 82), or its one
// source's where it has one (format.ts averageRating). rating:>80,
// rating:>=80, rating:<60, rating:=90, a range rating:80-90 (both ends in),
// and a bare rating:80 for "80 or more"; a % may follow any number. A
// prediction market's forecast is not a review, so it counts for nothing,
// and a pin without ratings matches no rating: term. Unlike the other fields
// several rating: terms narrow each other, so rating:>=70 rating:<90 is a
// band; anything that is not a bound is left out rather than matching nothing.
//
// delay: takes a bound on how far a pin's start has slipped from the day first
// promised, the span its "2 MONTHS LATE" badge shows. It reads the same
// operators as rating: - delay:>=2months, delay:>6weeks, delay:<1year,
// delay:=3months, a range delay:2-6months (both ends in), and a bare
// delay:2months for "that late or more" - over a number and a unit: days,
// weeks, months or years (d, w, m/mo, y/yr, or spelled out; no unit is
// days; years may be fractional, delay:>2.5years). Days and weeks count
// days. Months and years count calendar months, as the badge does, so a
// pin the badge calls 2 months late is 2 months late here whatever the
// months' lengths. A pin that has not slipped (no original date, or a start
// no later than it) matches no delay: term. Several narrow each other.
//
// user: takes a name with or without its "@" (user:@ThePinGang), and a bare
// @ThePinGang still works on its own, as it did before user: existed.
//
// A bare $ and a stock symbol ($NKE, $brk.b) is a company ticker: the pins
// whose company is listed under it, or which carry it as their company's
// stock. Several companies can share one (Sony's divisions all trade as
// SONY), so it widens to all of them, as a second company: term would.
// Only a letter may follow the $, so "$5 million" stays free text.
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

import { compareDayKeys, nextDayKey } from '@/lib/format';
import { type ConfidenceBand, isConfidenceBand } from '@/lib/referenceConfidence';

// One side of a rating: term, compared with the pin's rounded percentage.
export type RatingBound = { op: '>' | '>=' | '<' | '<=' | '='; value: number };

// One side of a delay: term. Weeks are already days and years months, so a
// bound counts either days or calendar months.
export type DelayBound = { op: RatingBound['op']; unit: 'days' | 'months'; value: number };

// One side of a date:, posted: or updated: comparison, as a day boundary: from the start
// of that day on (">="), or before the start of it ("<"). "after D" and "on or
// before D" are written as the day after.
export type DayBound = { op: '>=' | '<'; day: string };

export type SearchQuery = {
  userNames: string[];
  // Pin ids, matching exactly those pins.
  ids: number[];
  companies: string[];
  // Stock symbols, uppercase, any of them.
  tickers: string[];
  confidences: string[];
  // Bands of a pin's overall score ("low", "medium", "high"), which widen the
  // same confidence: field the levels do.
  confidenceBands: ConfidenceBand[];
  // Day keys ("2026-09-08"), any of them: when pins start, when they were
  // posted, and when they were updated.
  dates: string[];
  postedDays: string[];
  updatedDays: string[];
  // Comparisons on those days, every one of them (a pin's start, a pin's
  // posting, any of a pin's updates).
  dateBounds: DayBound[];
  postedBounds: DayBound[];
  updatedBounds: DayBound[];
  tags: string[];
  excludeTags: string[];
  // Places an address must name: cities, states, postal codes, countries.
  places: string[];
  // Bounds a pin's rating must meet, every one of them.
  ratings: RatingBound[];
  // Bounds a pin's delay must meet, every one of them.
  delays: DelayBound[];
  text: string;
};

const SMART_DOUBLE_QUOTES = /[“”„‟″]/g;
const SMART_SINGLE_QUOTES = /[‘’‚‛′]/g;

// A leading "-" leaves out what the term would match (-tag:Anime); only tags
// read it so far, and any other field written that way is left out.
const FIELD = '(-?(?:company|category|user|confidence|date|posted|updated|tag|pin|place|rating|delay))';
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

// A bare @name, or a bare $ticker standing as a word of its own.
const BARE_TERM = /(^|\s)(@\S+|\$[A-Za-z][A-Za-z0-9.-]{0,11}(?=\s|$))/g;

export type TermField = 'user' | 'ticker' | 'company' | 'category' | 'confidence' | 'date' | 'posted' | 'updated' | 'tag' | 'pin' | 'place' | 'rating' | 'delay';

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

  // A bare @name or $ticker is only a term in the text the field terms
  // leave, as a user:@name value is theirs.
  const addText = (text: string) => {
    let from = 0;
    for (const match of text.matchAll(BARE_TERM)) {
      const start = match.index + match[1].length;
      if (start > from) parts.push({ kind: 'text', raw: text.slice(from, start) });
      const ticker = match[2].startsWith('$');
      parts.push({ kind: 'term', field: ticker ? 'ticker' : 'user', value: ticker ? match[2].slice(1).toUpperCase() : match[2], raw: match[2] });
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
    tickers: [],
    confidences: [],
    confidenceBands: [],
    dates: [],
    postedDays: [],
    updatedDays: [],
    dateBounds: [],
    postedBounds: [],
    updatedBounds: [],
    tags: [],
    excludeTags: [],
    places: [],
    ratings: [],
    delays: [],
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
    } else if (part.field === 'ticker') {
      addUnique(query.tickers, part.value);
    } else if (part.field === 'confidence') {
      addConfidence(query, part.value);
    } else if (part.field === 'pin') {
      // Anything that is not a pin id is left out rather than matching nothing.
      for (const id of part.value.split(',')) {
        const n = Number(id.trim());
        if (Number.isInteger(n) && n > 0 && !query.ids.includes(n)) query.ids.push(n);
      }
    } else if (part.field === 'date' || part.field === 'posted' || part.field === 'updated') {
      // Anything but a day or a comparison on one is left out rather than
      // matching nothing.
      const { days, bounds } = dayBounds(part.value);
      const [exact, compared] =
        part.field === 'date' ? [query.dates, query.dateBounds] : part.field === 'posted' ? [query.postedDays, query.postedBounds] : [query.updatedDays, query.updatedBounds];
      for (const day of days) addUnique(exact, day);
      for (const bound of bounds) {
        if (!compared.some((b) => b.op === bound.op && b.day === bound.day)) compared.push(bound);
      }
    } else if (part.field === 'place') {
      addUnique(query.places, part.value);
    } else if (part.field === 'rating') {
      for (const bound of ratingBounds(part.value)) {
        if (!query.ratings.some((b) => b.op === bound.op && b.value === bound.value)) query.ratings.push(bound);
      }
    } else if (part.field === 'delay') {
      for (const bound of delayBounds(part.value)) {
        if (!query.delays.some((b) => b.op === bound.op && b.unit === bound.unit && b.value === bound.value)) query.delays.push(bound);
      }
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
    query.tickers.length ||
    query.confidences.length ||
    query.confidenceBands.length ||
    query.dates.length ||
    query.postedDays.length ||
    query.updatedDays.length ||
    query.dateBounds.length ||
    query.postedBounds.length ||
    query.updatedBounds.length ||
    query.tags.length ||
    query.excludeTags.length ||
    query.places.length ||
    query.ratings.length ||
    query.delays.length
  );
}

// Whether the viewer's time zone changes what the query matches: its days are
// the viewer's own. Everything else answers the same everywhere, so it can be
// cached once for all zones.
export function dependsOnZone(query: SearchQuery): boolean {
  return !!(
    query.dates.length ||
    query.postedDays.length ||
    query.updatedDays.length ||
    query.dateBounds.length ||
    query.postedBounds.length ||
    query.updatedBounds.length
  );
}

const DAY = '(-?\\d{4,6}-\\d{2}-\\d{2})';
const DAY_COMPARISON = new RegExp(`^(>=|<=|=>|=<|>|<|=)?${DAY}$`);
const DAY_RANGE = new RegExp(`^${DAY}\\.\\.${DAY}$`);

// What a date:, posted: or updated: value sets: a bare day or "=" one is an exact day, a
// comparison or range is boundaries, and anything else sets nothing.
export function dayBounds(value: string): { days: string[]; bounds: DayBound[] } {
  const text = value.trim();
  const range = DAY_RANGE.exec(text);
  if (range) {
    const [low, high] = [range[1], range[2]].sort(compareDayKeys);
    return {
      days: [],
      bounds: [
        { op: '>=', day: low },
        { op: '<', day: nextDayKey(high) },
      ],
    };
  }
  const bound = DAY_COMPARISON.exec(text);
  if (!bound) {
    return { days: [], bounds: [] };
  }
  const op = ({ '=>': '>=', '=<': '<=' } as Record<string, string>)[bound[1] ?? ''] ?? bound[1] ?? '=';
  const day = bound[2];
  if (op === '=') return { days: [day], bounds: [] };
  if (op === '>=') return { days: [], bounds: [{ op: '>=', day }] };
  if (op === '>') return { days: [], bounds: [{ op: '>=', day: nextDayKey(day) }] };
  if (op === '<') return { days: [], bounds: [{ op: '<', day }] };
  return { days: [], bounds: [{ op: '<', day: nextDayKey(day) }] };
}

const PERCENT = '(\\d+(?:\\.\\d+)?)\\s*%?';
const RATING_BOUND = new RegExp(`^(>=|<=|=>|=<|>|<|=)?\\s*${PERCENT}$`);
const RATING_RANGE = new RegExp(`^${PERCENT}\\s*-\\s*${PERCENT}$`);

// The bounds a rating: value sets: one, two for a range, none for anything
// else. A bare number is a floor, which is what someone asking for "80" wants.
export function ratingBounds(value: string): RatingBound[] {
  const text = value.trim();
  const range = RATING_RANGE.exec(text);
  if (range) {
    const [low, high] = [Number(range[1]), Number(range[2])].sort((a, b) => a - b);
    return [
      { op: '>=', value: low },
      { op: '<=', value: high },
    ];
  }
  const bound = RATING_BOUND.exec(text);
  if (!bound) {
    return [];
  }
  const op = ({ '=>': '>=', '=<': '<=' } as Record<string, RatingBound['op']>)[bound[1] ?? ''] ?? ((bound[1] || '>=') as RatingBound['op']);
  return [{ op, value: Number(bound[2]) }];
}

const SPAN = '(\\d+(?:\\.\\d+)?)\\s*([a-z]*)';
const DELAY_BOUND = new RegExp(`^(>=|<=|=>|=<|>|<|=)?\\s*${SPAN}$`, 'i');
const DELAY_RANGE = new RegExp(`^${SPAN}\\s*-\\s*${SPAN}$`, 'i');

// Each unit's spelling and what it comes to: days (a week is seven) or
// calendar months (a year is twelve).
const DELAY_UNITS: { names: RegExp; unit: DelayBound['unit']; per: number }[] = [
  { names: /^(d|days?)?$/, unit: 'days', per: 1 },
  { names: /^(w|wks?|weeks?)$/, unit: 'days', per: 7 },
  { names: /^(m|mos?|months?)$/, unit: 'months', per: 1 },
  { names: /^(y|yrs?|years?)$/, unit: 'months', per: 12 },
];

function delaySpan(amount: string, name: string): Pick<DelayBound, 'unit' | 'value'> | null {
  const unit = DELAY_UNITS.find((u) => u.names.test(name.toLowerCase()));
  return unit ? { unit: unit.unit, value: Number(amount) * unit.per } : null;
}

// The bounds a delay: value sets: one, two for a range, none for anything
// else - a span with no number or an unknown unit is left out, not matched.
// A range's unit may be given once, at its end (2-6months), or on both ends
// (2months-1year); one that mixes days and months is left out.
export function delayBounds(value: string): DelayBound[] {
  const text = value.trim();
  const range = DELAY_RANGE.exec(text);
  if (range) {
    const first = delaySpan(range[1], range[2] || range[4]);
    const last = delaySpan(range[3], range[4]);
    if (!first || !last || first.unit !== last.unit) {
      return [];
    }
    const [low, high] = [first.value, last.value].sort((a, b) => a - b);
    return [
      { op: '>=', unit: first.unit, value: low },
      { op: '<=', unit: first.unit, value: high },
    ];
  }
  const bound = DELAY_BOUND.exec(text);
  const span = bound && delaySpan(bound[2], bound[3]);
  if (!bound || !span) {
    return [];
  }
  const op = ({ '=>': '>=', '=<': '<=' } as Record<string, DelayBound['op']>)[bound[1] ?? ''] ?? ((bound[1] || '>=') as DelayBound['op']);
  return [{ op, ...span }];
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
