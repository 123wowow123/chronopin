'use client';

import { useT } from '@/lib/client/i18n';
import { THREAD_TAG, type PinTagJson } from '@/lib/tags';
import { Icon } from '../ui/Icon';
import { RefineLink } from './RefineLink';

// The pin's tags as chips, each a search for the pins sharing it (a tag: term,
// added to the query on the search page). Awards lead; plain text, save for
// the thread tag, which wears the same icon the cards mark a thread with.
export function PinTags({ tags, className = '' }: { tags?: PinTagJson[]; className?: string }) {
  const t = useT();
  if (!tags?.length) return null;
  return (
    <section aria-labelledby="tags-heading" className={`mb-4 text-sm ${className}`}>
      <h2 id="tags-heading" className="mb-1.5 text-[11px] font-semibold tracking-wider text-subtle uppercase">
        {t('pin.tags')}
      </h2>
      <ul className="flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <li key={tag.name}>
            <RefineLink
              field="tag"
              value={tag.name}
              title={t('pin.showTagged', { name: tag.name })}
              className="inline-flex items-center rounded-full bg-field px-2.5 py-1 text-xs font-medium text-muted ring-1 ring-line ring-inset hover:bg-raised hover:text-ink hover:no-underline"
            >
              {tag.name.toLowerCase() === THREAD_TAG.toLowerCase() ? <Icon name="thread" className="mr-1 size-3.5" /> : null}
              {tag.name}
            </RefineLink>
          </li>
        ))}
      </ul>
    </section>
  );
}
