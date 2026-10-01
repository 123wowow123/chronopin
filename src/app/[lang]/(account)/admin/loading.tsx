'use client';

import { usePathname } from '@/lib/client/navigation';
import { AdminTabs } from './AdminTabs';

// What an admin page shows while its numbers load: the tabs, with the one
// picked already marked, over grey blocks where the charts and tables will be.
// Shown at once on a tab click (it is prefetched) and on a first load, rather
// than the old page sitting there for the seconds a dashboard takes. The page
// puts its own tabs in the same place, so they do not move when it arrives.
export default function AdminLoading() {
  // "/admin/settings/translations" is under the Settings tab.
  const current = usePathname().split('/').slice(0, 3).join('/');
  const block = 'animate-pulse rounded-lg bg-raised motion-reduce:animate-none';
  return (
    <div className="px-4 py-6 sm:py-10 lg:px-8">
      <AdminTabs current={current} />
      <p role="status" className="sr-only">
        Loading
      </p>
      <div aria-hidden>
        <div className={`mb-6 h-4 w-2/3 max-w-xl ${block}`} />
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={`h-20 ${block}`} />
          ))}
        </div>
        <div className={`mb-6 h-72 ${block}`} />
        <div className={`h-48 ${block}`} />
      </div>
    </div>
  );
}
