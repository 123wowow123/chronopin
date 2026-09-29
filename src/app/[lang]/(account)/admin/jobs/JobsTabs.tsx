import Link from '@/components/ui/Link';

const TABS = [
  { href: '/admin/jobs', label: 'Daily jobs' },
  { href: '/admin/jobs/lint', label: 'Lint' },
];

// The Jobs tab's own two: the daily pin jobs, and the okf:lint findings that
// keep the pins in order. Set as the charts' view switch is (chartParts.tsx).
export function JobsTabs({ current }: { current: string }) {
  return (
    <nav aria-label="Jobs" className="mb-6 flex w-fit rounded-lg border border-line p-0.5">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={tab.href === current ? 'page' : undefined}
          className={`btn btn-sm hover:no-underline ${tab.href === current ? 'bg-raised text-ink' : 'btn-ghost'}`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
