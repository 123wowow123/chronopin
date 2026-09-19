import Link from '@/components/ui/Link';

const TABS = [
  { href: '/admin/views', label: 'Views' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/pins', label: 'Pins' },
];

// Switches between the admin pages, Views first: /admin opens on it
// (next.config.ts). `current` is the page rendering it.
export function AdminTabs({ current }: { current: string }) {
  return (
    <nav aria-label="Admin" className="mb-6 flex gap-1 border-b border-line">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={tab.href === current ? 'page' : undefined}
          className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium hover:no-underline ${
            tab.href === current ? 'border-accent text-ink' : 'border-transparent text-subtle hover:text-ink'
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
