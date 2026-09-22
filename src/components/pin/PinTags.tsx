'use client';

import { useT } from '@/lib/client/i18n';
import { categoryLabel, tagLabel } from '@/lib/i18n/labels';
import { reservedTag, type PinTagJson } from '@/lib/tags';
import { Icon } from '../ui/Icon';
import { RefineLink } from './RefineLink';

// The pin's tags as chips, each a search for the pins sharing it (a tag: term,
// added to the query on the search page). Awards lead; plain text, save for
// the site's own reserved tags - the thread tag - which are outlined and wear
// their own icon, as they are in the tag cloud's strip of site filters.
//
// Its further categories lead the rest: only the main one is named at the top
// of the page, and the others are tags like any other here (a category reads
// as a tag: term), rather than a row of headings that says which of them the
// pin is really about.
export function PinTags({ tags, categories, className = '' }: { tags?: PinTagJson[]; categories?: string[]; className?: string }) {
  const t = useT();
  const shown = [
    ...(categories ?? []).map((name) => ({ name, label: categoryLabel(t, name), reserved: undefined })),
    ...(tags ?? []).map((tag) => ({ name: tag.name, label: tagLabel(t, tag), reserved: tag.kind === 'reserved' ? reservedTag(tag.name) : undefined })),
  ];
  if (!shown.length) return null;
  // The label leads the chips on their line, as the stock pills' label does,
  // and they wrap under themselves when there are more than one line holds.
  return (
    <section aria-labelledby="tags-heading" className={`mb-4 flex flex-wrap items-baseline gap-1.5 text-sm ${className}`}>
      <h2 id="tags-heading" className="mr-1 text-[11px] font-semibold tracking-wider text-subtle uppercase">
        {t('pin.tags')}
      </h2>
      <ul className="flex min-w-0 flex-1 flex-wrap gap-1.5">
        {shown.map((tag) => (
          <li key={tag.name}>
            <RefineLink
              field="tag"
              value={tag.name}
              title={t('pin.showTagged', { name: tag.label })}
              className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium text-muted hover:bg-raised hover:text-ink hover:no-underline ${
                tag.reserved ? 'border border-dashed border-line' : 'bg-field ring-1 ring-line ring-inset'
              }`}
            >
              {tag.reserved ? <Icon name={tag.reserved.icon} className="mr-1 size-3.5" /> : null}
              {tag.label}
            </RefineLink>
          </li>
        ))}
      </ul>
    </section>
  );
}
