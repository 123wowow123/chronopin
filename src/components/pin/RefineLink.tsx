'use client';

import Link from '@/components/ui/Link';
import { useRouter } from '@/lib/client/navigation';
import { splitLocale } from '@/lib/i18n/config';
import { refineQuery, term, type LabelField } from '@/lib/searchTerms';
import { useT } from '@/lib/client/i18n';

// A pin label (author, company, category or other tag) that searches for pins sharing it.
// The href is a plain search for crawlers; on the search page a click adds
// the term to the query already showing.
export function RefineLink({
  field,
  value,
  className,
  children,
  title,
}: {
  field: LabelField;
  value: string;
  className?: string;
  children: React.ReactNode;
  title?: string;
}) {
  const router = useRouter();
  const t = useT();
  const href = `/search?q=${encodeURIComponent(term(field, value))}`;

  return (
    <Link
      href={href}
      prefetch={false}
      className={className}
      title={title ?? t('card.showAllValue', { value })}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || splitLocale(window.location.pathname).path !== '/search') {
          return;
        }
        event.preventDefault();
        const current = new URLSearchParams(window.location.search);
        current.set('q', refineQuery(current.get('q') || '', field, value));
        router.push(`/search?${current.toString()}`);
      }}
    >
      {children}
    </Link>
  );
}
