'use client';

import Link from '@/components/ui/Link';
import { Icon } from '@/components/ui/Icon';
import { useT } from '@/lib/client/i18n';
import { term } from '@/lib/searchTerms';
import type { SearchedCompany } from '@/lib/types';

// A company's parent (and that one's parent, up), each a tile that searches
// for it: Rockstar North under Rockstar Games under Take-Two. Nothing for a
// company with no parent.
export function CompanyParentsPanel({ parents }: { parents: NonNullable<SearchedCompany['parents']> }) {
  const t = useT();
  if (!parents.length) return null;
  return (
    <section aria-label={t('company.parent', { count: parents.length })} className="floating flex flex-col gap-2 px-4 py-3.5">
      <h2 className="text-sm font-semibold text-ink">{t('company.parent', { count: parents.length })}</h2>
      <ul className="-mx-2 flex flex-col">
        {parents.map((p) => (
          <li key={p.id}>
            <Link
              href={`/search?q=${encodeURIComponent(term('company', p.name))}`}
              title={t('company.parentHint', { name: p.name })}
              className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-ink hover:bg-raised hover:no-underline"
            >
              {p.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- favicons from arbitrary hosts
                <img src={p.logoUrl} alt="" loading="lazy" referrerPolicy="no-referrer" className="size-8 shrink-0 rounded" />
              ) : (
                <span className="size-8 shrink-0 rounded bg-raised" />
              )}
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{p.name}</span>
              <Icon name="chevron" className="size-3.5 shrink-0 -rotate-90 text-subtle rtl:rotate-90" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
