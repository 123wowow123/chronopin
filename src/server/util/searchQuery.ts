// Splits a search box query into the structured terms a pin card's labels add
// and whatever free text is left over:
//
//   user:ThePinGang company:"Electronic Arts" category:Software iphone
//
// confidence: takes a pin's date confidence level, as its badge shows it
// (confidence:estimated); UNVERIFIED is the badge for the stored "unknown", so
// either word works.
//
// date: takes a day as the timeline writes it (date:2026-09-08, or
// date:-2560-01-01 for 2561 BC): the pins starting that day as the timeline
// places them - an all-day pin on its own date, a timed one on its date in
// the viewer's time zone. A day's "View all" popup and a card's start date
// link to one. posted: takes a day the same way, for the pins posted that day
// in the viewer's time zone; a card's posted date links to one.
//
// user: takes a name with or without its "@" (user:@ThePinGang), and a bare
// @ThePinGang still works on its own, as it did before user: existed.
//
// A value with spaces is quoted, as the labels write it. Several values for
// one field widen the search (either company), while different fields narrow
// it (this company and this category), so each click on a label is additive.
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

export type SearchQuery = {
  userNames: string[];
  companies: string[];
  categories: string[];
  confidences: string[];
  // Day keys ("2026-09-08"), any of them: when pins start, and when they
  // were posted.
  dates: string[];
  postedDays: string[];
  text: string;
};

const SMART_DOUBLE_QUOTES = /[“”„‟″]/g;
const SMART_SINGLE_QUOTES = /[‘’‚‛′]/g;

const FIELD = '(company|category|user|confidence|date|posted)';
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

export type TermField = 'user' | 'company' | 'category' | 'confidence' | 'date' | 'posted';

export type QueryPart =
  | { kind: 'term'; field: TermField; value: string; raw: string }
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
    const field = groups[at]!.toLowerCase() as TermField;
    parts.push({ kind: 'term', field, value: groups[at + 1]!.trim(), raw: match[0].slice(match[1].length) });
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
    companies: [],
    categories: [],
    confidences: [],
    dates: [],
    postedDays: [],
    text: '',
  };

  const text: string[] = [];
  for (const part of splitSearchQuery(searchText)) {
    if (part.kind === 'text') {
      text.push(part.raw);
    } else if (part.field === 'user') {
      addUserName(query, part.value);
    } else if (part.field === 'confidence') {
      addConfidence(query, part.value);
    } else if (part.field === 'date' || part.field === 'posted') {
      // Anything but a day is left out rather than matching nothing.
      if (DAY_KEY.test(part.value)) addUnique(part.field === 'date' ? query.dates : query.postedDays, part.value);
    } else if (part.value) {
      addUnique(part.field === 'company' ? query.companies : query.categories, part.value);
    }
  }

  query.text = text.join(' ').replace(/\s+/g, ' ').trim();
  return query;
}

export function hasFilters(query: SearchQuery): boolean {
  return !!(query.userNames.length || query.companies.length || query.categories.length || query.confidences.length || query.dates.length || query.postedDays.length);
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

// Levels are stored lowercase; UNVERIFIED is how the badge shows "unknown".
function addConfidence(query: SearchQuery, value: string) {
  const level = value.trim().toLowerCase();
  if (level) {
    addUnique(query.confidences, level === 'unverified' ? 'unknown' : level);
  }
}

function addUnique(list: string[], value: string) {
  const lower = value.toLowerCase();
  if (!list.some((existing) => existing.toLowerCase() === lower)) {
    list.push(value);
  }
}
