// Names the data carries in English, shown in the page's language. The data
// keeps its English (search terms, URLs, the database); only the label changes.

import { canonicalCategory, slugify } from '../categories';
import type { Translator } from './translate';

// "Astronomy" -> "Astronomía". A tag that is not one of the
// fixed categories keeps its own name.
export function categoryLabel(t: Translator, name: string): string {
  const canonical = canonicalCategory(name);
  return t.dynamic(`categories.${slugify(canonical)}`, canonical);
}
