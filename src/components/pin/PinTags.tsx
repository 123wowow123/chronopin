import type { PinTagJson } from '@/lib/tags';
import { RefineLink } from './RefineLink';

// The pin's tags as chips, each a search for the pins sharing it (a tag: term,
// added to the query on the search page). Awards lead, marked with a trophy.
export function PinTags({ tags, className = '' }: { tags?: PinTagJson[]; className?: string }) {
  if (!tags?.length) return null;
  return (
    <section aria-labelledby="tags-heading" className={`mb-4 text-sm ${className}`}>
      <h2 id="tags-heading" className="mb-1.5 text-[11px] font-semibold tracking-wider text-subtle uppercase">
        Tags
      </h2>
      <ul className="flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <li key={tag.name}>
            <RefineLink
              field="tag"
              value={tag.name}
              title={`Show all pins tagged ${tag.name}`}
              className="inline-flex items-center gap-1 rounded-full bg-field px-2.5 py-1 text-xs font-medium text-muted ring-1 ring-line ring-inset hover:bg-raised hover:text-ink hover:no-underline"
            >
              {tag.kind === 'award' ? (
                <span aria-hidden>🏆</span>
              ) : tag.kind === 'nomination' ? (
                // Up for it, not won: a ribbon, never a trophy.
                <span aria-hidden>🎗️</span>
              ) : (
                <span aria-hidden className="text-subtle">
                  #
                </span>
              )}
              {tag.name}
            </RefineLink>
          </li>
        ))}
      </ul>
    </section>
  );
}
