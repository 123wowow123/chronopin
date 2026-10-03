// Building search queries from a pin card's labels (user, company, category tag,
// date confidence, start date, posted date, NEW/UPDATED pills, place) and the tag cloud.
// A click adds its term to the search already showing rather than replacing
// it, so each click narrows the results (or, for a second company, widens
// them). The server parses these in src/server/util/searchQuery.ts.

// 'pin' is not a label anything on a card writes: it names pins by id, for a
// batch of notifications linking to exactly the pins it stands for. '-tag'
// is a tag left out (the tag cloud's second click): the field is written
// with its minus, so every helper here handles it as a field of its own.
// 'rating' and 'delay' are bounds (rating:>=81, delay:>=2months), which their
// pills write. 'ticker' is a company's stock symbol, written bare with a $
// ($NKE) rather than as a field.
export type LabelField = 'user' | 'ticker' | 'company' | 'confidence' | 'date' | 'posted' | 'updated' | 'tag' | '-tag' | 'pin' | 'place' | 'rating' | 'delay';
// Fields a query may still hold but no label writes: category: is the old
// name for a category's tag: term, which can only be taken out.
type AnyField = LabelField | 'category' | '-category';

// Straight and smart double quotes - never part of a name, so they are
// stripped from label values and treated alike when reading a query.
const DOUBLE_QUOTES = /["“”„‟″]/g;
// Smart single quotes, read as a plain ' - both a quote and an apostrophe, so
// unlike double quotes never stripped from a name.
const SMART_SINGLE_QUOTES = /[‘’‚‛′]/g;

// User names are stored with a leading "@", which user: leaves out.
function termValue(field: AnyField, value: string) {
  return field === 'user' ? value.replace(/^@+/, '') : value;
}

// A value with spaces is quoted: company:"Electronic Arts".
export function term(field: LabelField, value: string): string {
  const name = termValue(field, String(value).replace(DOUBLE_QUOTES, '').trim());
  if (field === 'ticker') return `$${name.replace(/^\$+/, '').toUpperCase()}`;
  return /\s/.test(name) ? `${field}:"${name}"` : `${field}:${name}`;
}

// Every spelling of a term the server accepts - bare, value quoted or whole
// term quoted, either kind of quote - lowercased, for matching a normalized query.
function termForms(field: AnyField, value: string): string[] {
  const lower = termValue(field, value).toLowerCase();
  if (field === 'ticker') return [`$${lower.replace(/^\$+/, '')}`];
  const values = field === 'user' ? [lower, `@${lower}`] : [lower];
  return values.reduce<string[]>(
    (all, v) =>
      all.concat(
        ['"', "'"].reduce<string[]>(
          (quoted, quote) => quoted.concat([`${field}:${quote}${v}${quote}`, `${quote}${field}:${v}${quote}`]),
          [`${field}:${v}`],
        ),
      ),
    field === 'user' ? [`@${lower}`] : [],
  );
}

// The query padded with spaces, quotes made plain and lowercased. Each change
// is one character for one, so positions match the padded original.
function normalize(query: string) {
  return ` ${query.replace(DOUBLE_QUOTES, '"').replace(SMART_SINGLE_QUOTES, "'").toLowerCase()} `;
}

// Whether the query already holds this term in any form the server accepts -
// bare, value quoted or whole term quoted, either kind of quote, any case.
export function hasTerm(query: string, field: AnyField, value: string): boolean {
  const normalized = normalize(query);
  return termForms(field, value).some((form) => normalized.includes(` ${form} `));
}

// The query without this term, in whichever forms it was written.
export function removeTerm(query: string, field: AnyField, value: string): string {
  let rest = query;
  for (const form of termForms(field, value)) {
    let at: number;
    // Matched in the padded form, so `at` is where the term's leading space sits.
    while ((at = normalize(rest).indexOf(` ${form} `)) !== -1) {
      rest = `${rest.slice(0, Math.max(at - 1, 0))} ${rest.slice(at + form.length)}`;
    }
  }
  return rest.replace(/\s+/g, ' ').trim();
}

// The query after a quick filter's toggle: adds the term, or takes it out.
export function toggleTerm(query: string, field: LabelField, value: string): string {
  return hasTerm(query, field, value) ? removeTerm(query, field, value) : refineQuery(query, field, value);
}

// Every rating: or delay: term, in any quoting. Bounds narrow each other, so a
// pill's click replaces the ones of its field instead of piling another on.
const BOUND_TERMS: Partial<Record<LabelField, RegExp>> = {
  rating: /(^|\s)["'“”‘’]?rating:\S*/gi,
  delay: /(^|\s)["'“”‘’]?delay:\S*/gi,
};

// The query after clicking a label while `current` is showing.
export function refineQuery(current: string, field: LabelField, value: string): string {
  const cleaned = String(value || '').replace(DOUBLE_QUOTES, '').trim();
  const bounds = BOUND_TERMS[field];
  const base = (bounds ? current.replace(bounds, ' ').replace(/\s+/g, ' ') : current).trim();
  if (!cleaned || hasTerm(base, field, cleaned)) {
    return base;
  }
  return `${base} ${term(field, cleaned)}`.trim();
}
