'use client';

import Link from '@/components/ui/Link';
import { useRouter } from '@/lib/client/navigation';
import { hrefNearDay } from '@/lib/client/returnSpot';
import { splitLocale } from '@/lib/i18n/config';
import { refineQuery, term, type LabelField } from '@/lib/searchTerms';
import { useT } from '@/lib/client/i18n';

// A pin label (author, company, category or other tag) that searches for pins sharing it.
// The href is a plain search for crawlers; on the search page a click adds
// the term to the query already showing. Clicked on a card by date, the
// search opens its dates on that card's day (or the nearest it has).
export function RefineLink({
  field,
  value,
  className,
  children,
  title,
  describedBy,
}: {
  field: LabelField;
  value: string;
  className?: string;
  children: React.ReactNode;
  title?: string;
  // The id of a tooltip saying what the label is (PillTip), in place of a title.
  describedBy?: string;
}) {
  const router = useRouter();
  const t = useT();
  const href = `/search?q=${encodeURIComponent(term(field, value))}`;

  return (
    <Link
      href={href}
      prefetch={false}
      className={className}
      title={describedBy ? undefined : (title ?? t('card.showAllValue', { value }))}
      aria-describedby={describedBy}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey) return;
        if (splitLocale(window.location.pathname).path !== '/search') {
          hrefNearDay(href, event.currentTarget);
          return;
        }
        event.preventDefault();
        const current = new URLSearchParams(window.location.search);
        current.set('q', refineQuery(current.get('q') || '', field, value));
        router.push(hrefNearDay(`/search?${current.toString()}`, event.currentTarget));
      }}
    >
      {children}
    </Link>
  );
}
