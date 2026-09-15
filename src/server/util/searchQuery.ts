// Splits a search box query into the structured terms a pin card's labels add
// and whatever free text is left over:
//
//   user:ThePinGang company:"Electronic Arts" category:Software iphone
//
// confidence: takes a pin's date confidence level, as its badge shows it
// (confidence:estimated); UNVERIFIED is the badge for the stored "unknown", so
// either word works.
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
  text: string;
};

const SMART_DOUBLE_QUOTES = /[“”„‟″]/g;
const SMART_SINGLE_QUOTES = /[‘’‚‛′]/g;

const FIELD = '(company|category|user|confidence)';
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

export type TermField = 'user' | 'company' | 'category' | 'confidence';

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
    } else if (part.value) {
      addUnique(part.field === 'company' ? query.companies : query.categories, part.value);
    }
  }

  query.text = text.join(' ').replace(/\s+/g, ' ').trim();
  return query;
}

export function hasFilters(query: SearchQuery): boolean {
  return !!(query.userNames.length || query.companies.length || query.categories.length || query.confidences.length);
}

// Applies a query's terms to pins that came back from free-text search, so
// "iphone company:Apple" means Apple pins about the iPhone.
export function matchesFilters(
  query: SearchQuery,
  pin: { user?: { userName?: string } | null; company?: string | null; category?: string | null; dateConfidence?: string | null },
): boolean {
  return (
    matchesAny(query.userNames, pin.user?.userName) &&
    matchesAny(query.companies, pin.company) &&
    matchesAny(query.categories, pin.category) &&
    matchesAny(query.confidences, pin.dateConfidence)
  );
}

// Case-insensitive, like the database's citext columns, so filtering
// free-text results agrees with what the database returns for the same terms.
function matchesAny(values: string[], actual: string | null | undefined): boolean {
  if (!values.length) {
    return true;
  }
  const lower = String(actual || '').toLowerCase();
  return values.some((value) => value.toLowerCase() === lower);
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
