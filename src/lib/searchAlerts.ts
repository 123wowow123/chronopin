// Saved searches with alerts (SearchAlert, 0237): the shapes shared by the
// server timer, the API and the pages.

export const MAX_SEARCH_ALERTS = 20;
export const MAX_QUERY_LENGTH = 500;
export const MAX_LABEL_LENGTH = 120;

export type SearchAlertRow = {
  id: number;
  query: string;
  label: string | null;
  notifyBell: boolean;
  notifyDigest: boolean;
};

// What the reader sees of a search: the name they gave it, else the query.
export const searchAlertName = (s: Pick<SearchAlertRow, 'query' | 'label'>) => s.label?.trim() || s.query;

// The same query typed twice, in another case or with other spacing, is one search.
export const normalizeQuery = (query: string) => query.trim().replace(/\s+/g, ' ');
