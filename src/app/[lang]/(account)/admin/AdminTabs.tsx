'use client';

import { useLinkStatus } from 'next/link';
import { Fragment } from 'react';
import { BackToMenu } from '@/components/nav/BackToMenu';
import { TabRow } from '@/components/nav/TabRow';
import Link from '@/components/ui/Link';

// In three groups, set apart by a rule: what the site is doing (its
// traffic, its buy clicks, its people, its pins, its comments, its private sellers' listings), keeping it
// in order (the jobs that run on a timer, with the lint findings under them),
// and the switches for what visitors see.
const GROUPS = [
  [
    { href: '/admin/views', label: 'Views' },
    { href: '/admin/clicks', label: 'Clicks' },
    { href: '/admin/bots', label: 'Bots' },
    { href: '/admin/users', label: 'Users' },
    { href: '/admin/pins', label: 'Pins' },
    { href: '/admin/comments', label: 'Comments' },
    { href: '/admin/listings', label: 'Listings' },
  ],
  [{ href: '/admin/jobs', label: 'Jobs' }],
  [{ href: '/admin/settings', label: 'Settings' }],
];

// Switches between the admin pages, Views first: /admin opens on it
// (next.config.ts). `current` is the page rendering it. The row is the
// section's head - the page names itself by the tab picked, with no title
// under it (each page keeps its h1 for screen readers only) - so the tabs are
// set at a heading's size, on a phone as well, and below lg the arrow back to
// the nav drawer leads them. Eight at that size are wider than the narrowest
// phones, so the names scroll sideways under the arrow as ProfileTabs' do,
// with the picked one brought into view.
export function AdminTabs({ current }: { current: string }) {
  return (
    <nav aria-label="Admin" className="mb-6 flex items-center gap-1 border-b border-line">
      <BackToMenu />
      <TabRow current={current}>
        {GROUPS.map((group, index) => (
          <Fragment key={group[0].href}>
            {index ? <span aria-hidden className="my-3 w-px shrink-0 self-stretch bg-line" /> : null}
            {group.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={tab.href === current ? 'page' : undefined}
                className={`relative shrink-0 border-b-2 px-2 py-3 text-xl font-semibold tracking-tight whitespace-nowrap hover:no-underline sm:px-4 ${
                  tab.href === current ? 'border-accent text-ink' : 'border-transparent text-subtle hover:text-ink'
                }`}
              >
                {tab.label}
                <Pending />
              </Link>
            ))}
          </Fragment>
        ))}
      </TabRow>
    </nav>
  );
}

// The admin pages are dynamic and signed-in, so a tab's page is not
// prefetched and a click can sit a second or two before anything moves. While
// it does, a short accent bar sweeps along the clicked tab's underline -
// after 100ms, so a quick switch does not flash it.
function Pending() {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden
      className={`absolute inset-x-0 -bottom-0.5 h-0.5 overflow-hidden transition-opacity ${pending ? 'opacity-100 delay-100' : 'opacity-0'}`}
    >
      {pending ? <span className="block h-full w-1/2 animate-sweep bg-accent" /> : null}
    </span>
  );
}
