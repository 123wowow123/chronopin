// Building search queries from a pin card's labels (user, company, category).
// A click adds its term to the search already showing rather than replacing
// it, so each click narrows the results (or, for a second company, widens
// them). The server parses these in src/server/util/searchQuery.ts.

export type LabelField = 'user' | 'company' | 'category';

// Straight and smart double quotes - never part of a name, so they are
// stripped from label values and treated alike when reading a query.
const DOUBLE_QUOTES = /["“”„‟″]/g;
// Smart single quotes, read as a plain ' - both a quote and an apostrophe, so
// unlike double quotes never stripped from a name.
const SMART_SINGLE_QUOTES = /[‘’‚‛′]/g;

// User names are stored with a leading "@", which user: leaves out.
function termValue(field: LabelField, value: string) {
  return field === 'user' ? value.replace(/^@+/, '') : value;
}

// A value with spaces is quoted: company:"Electronic Arts".
export function term(field: LabelField, value: string): string {
  const name = termValue(field, String(value).replace(DOUBLE_QUOTES, '').trim());
  return /\s/.test(name) ? `${field}:"${name}"` : `${field}:${name}`;
}

// Whether the query already holds this term in any form the server accepts -
// bare, value quoted or whole term quoted, either kind of quote, any case.
export function hasTerm(query: string, field: LabelField, value: string): boolean {
  const normalized = ` ${query.replace(DOUBLE_QUOTES, '"').replace(SMART_SINGLE_QUOTES, "'").toLowerCase()} `;
  const lower = termValue(field, value).toLowerCase();
  const values = field === 'user' ? [lower, `@${lower}`] : [lower];
  const forms = values.reduce<string[]>(
    (all, v) =>
      all.concat(
        ['"', "'"].reduce<string[]>(
          (quoted, quote) => quoted.concat([`${field}:${quote}${v}${quote}`, `${quote}${field}:${v}${quote}`]),
          [`${field}:${v}`],
        ),
      ),
    field === 'user' ? [`@${lower}`] : [],
  );
  return forms.some((form) => normalized.includes(` ${form} `));
}

// The query after clicking a label while `current` is showing.
export function refineQuery(current: string, field: LabelField, value: string): string {
  const cleaned = String(value || '').replace(DOUBLE_QUOTES, '').trim();
  const base = current.trim();
  if (!cleaned || hasTerm(base, field, cleaned)) {
    return base;
  }
  return `${base} ${term(field, cleaned)}`.trim();
}
