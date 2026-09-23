'use client';

import { useEffect, useRef } from 'react';
import { BackToMenu } from '@/components/nav/BackToMenu';
import Link from '@/components/ui/Link';
import { useT } from '@/lib/client/i18n';

const TABS = [
  { href: '/profile', label: 'account.profile' },
  { href: '/profile/following', label: 'profile.following' },
  { href: '/profile/preferences', label: 'profile.preferences' },
  { href: '/profile/password', label: 'account.password' },
] as const;

// Switches between the account's pages, as AdminTabs does the admin's: the row
// is the section's head, each page keeping its h1 for screen readers only, and
// below lg the arrow back to the nav drawer leads it. Some languages' four
// names are wider than a phone, so the names scroll sideways under the arrow
// (the row's line drawn by the nav, which the picked tab's underline covers),
// with the picked one brought into view.
export function ProfileTabs({ current }: { current: (typeof TABS)[number]['href'] }) {
  const t = useT();
  const row = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const picked = row.current?.querySelector<HTMLElement>('[aria-current="page"]');
    const box = row.current;
    if (picked && box && (picked.offsetLeft < box.scrollLeft || picked.offsetLeft + picked.offsetWidth > box.scrollLeft + box.clientWidth)) {
      box.scrollLeft = picked.offsetLeft + picked.offsetWidth - box.clientWidth;
    }
  }, [current]);
  return (
    <nav aria-label={t('account.profile')} className="mb-6 flex items-center gap-1 border-b border-line">
      <BackToMenu />
      <div ref={row} className="relative -mb-px flex min-w-0 gap-1.5 overflow-x-auto [scrollbar-width:none] sm:gap-3">
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={tab.href === current ? 'page' : undefined}
            className={`shrink-0 border-b-2 px-2 py-3 text-xl font-semibold tracking-tight whitespace-nowrap hover:no-underline sm:px-4 ${
              tab.href === current ? 'border-accent text-ink' : 'border-transparent text-subtle hover:text-ink'
            }`}
          >
            {t(tab.label)}
          </Link>
        ))}
      </div>
    </nav>
  );
}
