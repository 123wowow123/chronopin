import { BackToMenu } from '@/components/nav/BackToMenu';
import Link from '@/components/ui/Link';

const TABS = [
  { href: '/admin/views', label: 'Views' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/pins', label: 'Pins' },
  { href: '/admin/lint', label: 'Lint' },
];

// Switches between the admin pages, Views first: /admin opens on it
// (next.config.ts). `current` is the page rendering it. The row is the
// section's head - the page names itself by the tab picked, with no title
// under it (each page keeps its h1 for screen readers only) - so the tabs are
// set at a heading's size (a step down and closer together on a phone, where
// the four and the arrow have under 260px at the narrowest), and below lg the
// arrow back to the nav drawer leads them.
export function AdminTabs({ current }: { current: string }) {
  return (
    <nav aria-label="Admin" className="mb-6 flex items-center gap-1 border-b border-line">
      <BackToMenu />
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={tab.href === current ? 'page' : undefined}
          className={`-mb-px border-b-2 px-2 py-2.5 text-base font-semibold tracking-tight hover:no-underline sm:px-3 sm:text-lg ${
            tab.href === current ? 'border-accent text-ink' : 'border-transparent text-subtle hover:text-ink'
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
