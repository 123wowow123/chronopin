// Names the data carries in English, shown in the page's language. The data
// keeps its English (search terms, URLs, the database); only the label changes.

import { canonicalCategory, slugify } from '../categories';
import { reservedTag, tagKind } from '../tags';
import type { Translator } from './translate';

// "Astronomy" -> "Astronomía". A tag that is not one of the
// fixed categories keeps its own name.
export function categoryLabel(t: Translator, name: string): string {
  const canonical = canonicalCategory(name);
  return t.dynamic(`categories.${slugify(canonical)}`, canonical);
}

// A tag as shown: a category and the site's own reserved filters are the
// site's words, so they are read in the page's language; any other tag is
// whatever it was typed as.
export function tagLabel(t: Translator, tag: { name: string; kind?: string }): string {
  const kind = tag.kind ?? tagKind(tag.name);
  const reserved = kind === 'reserved' ? reservedTag(tag.name) : undefined;
  if (reserved) return t.dynamic(`reserved.${reserved.key}`, reserved.name);
  return kind === 'category' ? categoryLabel(t, tag.name) : tag.name;
}
