'use client';

import { useEffect, useRef } from 'react';
import { BackToMenu } from '@/components/nav/BackToMenu';
import Link from '@/components/ui/Link';

const TABS = [
  { href: '/admin/views', label: 'Views' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/pins', label: 'Pins' },
  { href: '/admin/lint', label: 'Lint' },
  { href: '/admin/jobs', label: 'Jobs' },
];

// Switches between the admin pages, Views first: /admin opens on it
// (next.config.ts). `current` is the page rendering it. The row is the
// section's head - the page names itself by the tab picked, with no title
// under it (each page keeps its h1 for screen readers only) - so the tabs are
// set at a heading's size, on a phone as well, and below lg the arrow back to
// the nav drawer leads them. Five at that size are wider than the narrowest
// phones, so the names scroll sideways under the arrow as ProfileTabs' do,
// with the picked one brought into view.
export function AdminTabs({ current }: { current: string }) {
  const row = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const picked = row.current?.querySelector<HTMLElement>('[aria-current="page"]');
    const box = row.current;
    if (picked && box && (picked.offsetLeft < box.scrollLeft || picked.offsetLeft + picked.offsetWidth > box.scrollLeft + box.clientWidth)) {
      box.scrollLeft = picked.offsetLeft + picked.offsetWidth - box.clientWidth;
    }
  }, [current]);
  return (
    <nav aria-label="Admin" className="mb-6 flex items-center gap-1 border-b border-line">
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
            {tab.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
