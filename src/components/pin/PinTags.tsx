'use client';

import { useT } from '@/lib/client/i18n';
import { categoryLabel, tagLabel } from '@/lib/i18n/labels';
import { isReserved, isStoredSiteTag, reservedTag, RESERVED_TAGS, type PinTagJson, type ReservedTag } from '@/lib/tags';
import { RefineLink } from './RefineLink';

// The pin's tags as chips, each a search for the pins sharing it (a tag: term,
// added to the query on the search page). The site's own reserved filters -
// prediction and thread tags - lead the list in a distinct color with a dashed
// outline matching the other pills in size.
//
// Its further categories lead the rest: only the main one is named at the top
// of the page, and the others are tags like any other here (a category reads
// as a tag: term), rather than a row of headings that says which of them the
// pin is really about.
// branching: the pin's thread branches somewhere below it (src/lib/thread.ts).
export function PinTags({ tags, categories, branching = false, className = '' }: { tags?: PinTagJson[]; categories?: string[]; branching?: boolean; className?: string }) {
  const t = useT();

  const reservedChips: { name: string; label: string; reserved: ReservedTag }[] = [];
  const categoryChips: { name: string; label: string; reserved: undefined }[] = [];
  const regularChips: { name: string; label: string; reserved: undefined }[] = [];
  const seen = new Set<string>();

  // Site filter tags (reserved tags) lead the list
  for (const tag of tags ?? []) {
    const key = tag.name.toLowerCase();
    if (seen.has(key)) continue;
    const reserved = isReserved(tag.name) ? reservedTag(tag.name) : tag.kind === 'reserved' ? reservedTag(tag.name) : undefined;
    if (reserved) {
      seen.add(key);
      reservedChips.push({ name: tag.name, label: tagLabel(t, tag), reserved });
    }
  }

  reservedChips.sort((a, b) => RESERVED_TAGS.indexOf(a.reserved) - RESERVED_TAGS.indexOf(b.reserved));

  // Categories next
  for (const name of categories ?? []) {
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    categoryChips.push({ name, label: categoryLabel(t, name), reserved: undefined });
  }

  // Ordinary tags follow
  for (const tag of tags ?? []) {
    const key = tag.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    regularChips.push({ name: tag.name, label: tagLabel(t, tag), reserved: undefined });
  }

  const shown = [...reservedChips, ...categoryChips, ...regularChips];
  if (!shown.length) return null;
  // The label leads the chips on their line, as the stock pills' label does,
  // and they wrap under themselves when there are more than one line holds.
  return (
    <section aria-labelledby="tags-heading" className={`mb-4 flex flex-wrap items-baseline gap-1.5 text-sm ${className}`}>
      <h2 id="tags-heading" className="me-1 text-[11px] font-semibold tracking-wider text-subtle uppercase">
        {t('pin.tags')}
      </h2>
      <ul className="flex min-w-0 flex-1 flex-wrap gap-1.5">
        {shown.map((tag) => (
          <li key={tag.name}>
            <RefineLink
              field="tag"
              value={tag.name}
              title={t('pin.showTagged', { name: tag.label })}
              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium transition-colors hover:no-underline ${
                isStoredSiteTag(tag.name)
                  ? 'border-dashed border-construction/50 bg-construction/10 text-construction hover:border-construction hover:bg-construction/20 hover:text-construction'
                  : tag.reserved
                  ? 'border-dashed border-tags/50 bg-tags/10 text-tags hover:border-tags hover:bg-tags/20 hover:text-tags'
                  : 'border-line bg-field text-muted hover:bg-raised hover:text-ink'
              }`}
            >
              {tag.label}
            </RefineLink>
          </li>
        ))}
      </ul>
    </section>
  );
}
