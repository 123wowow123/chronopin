'use client';

import Link from '@/components/ui/Link';
import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { useT } from '@/lib/client/i18n';
import { personPath } from '@/lib/people';
import { CompanySentimentChart } from './CompanySentiment';
import type { SearchedPerson } from '@/lib/types';

// The panel a search for one person opens with, beside the company's: who
// they are in a line or two, with the name and a link icon on the right both
// leading to their page (/person/<slug>): earnings, record and sources.
export function SearchedPersonPanel({ person }: { person: SearchedPerson }) {
  const t = useT();
  // The name and the icon are one link to the reader: pointing at either lights both.
  const [pointed, setPointed] = useState(false);
  const hover = {
    onMouseEnter: () => setPointed(true),
    onMouseLeave: () => setPointed(false),
  };
  const line = [person.office, person.party].filter(Boolean).join(' · ');
  const href = personPath(person.name);
  return (
    <div className="floating flex flex-col gap-3.5 px-4 py-3.5">
      <div>
        <div className="flex items-center gap-2.5">
          {person.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- portraits from arbitrary hosts
            <img src={person.photoUrl} alt="" loading="lazy" referrerPolicy="no-referrer" className="size-10 shrink-0 rounded-full object-cover" />
          ) : null}
          <div className="min-w-0 flex-1">
            {/* The icon shares the name's row, so the two centre on each other. */}
            <div className="flex items-center gap-2">
              <Link
                href={href}
                title={t('person.openProfile')}
                {...hover}
                className={`min-w-0 flex-1 truncate font-semibold hover:no-underline ${pointed ? 'text-link' : 'text-ink'}`}
              >
                {person.name}
              </Link>
              <Link
                href={href}
                title={t('person.openProfile')}
                aria-label={t('person.openProfile')}
                {...hover}
                className={`flex shrink-0 items-center ${pointed ? 'text-link' : 'text-subtle'}`}
              >
                <Icon name="external" className="size-3.5 rtl:-scale-x-100" />
              </Link>
            </div>
            {line ? <div className="text-xs text-subtle">{line}</div> : null}
          </div>
        </div>
        {person.description ? <p className="mt-2 text-sm leading-relaxed text-muted">{person.description}</p> : null}
      </div>

      {person.sentiment ? <CompanySentimentChart name={person.name} sentiment={person.sentiment} /> : null}
    </div>
  );
}
