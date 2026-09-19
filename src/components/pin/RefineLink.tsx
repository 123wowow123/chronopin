'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { refineQuery, term, type LabelField } from '@/lib/searchTerms';

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
  const href = `/search?q=${encodeURIComponent(term(field, value))}`;

  return (
    <Link
      href={href}
      prefetch={false}
      className={className}
      title={title ?? `Show all ${value} pins`}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || window.location.pathname !== '/search') {
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
