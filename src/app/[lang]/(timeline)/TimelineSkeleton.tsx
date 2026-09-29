'use client';

import { useT } from '@/lib/client/i18n';

// What a cold load shows until the first page of pins arrives. A client
// component so the layout's fallback renders at once: an async one (awaiting
// its words) would itself suspend, and the boundary would count as missing.
export function TimelineSkeleton() {
  const t = useT();
  return (
    <div className="px-3 pt-6 lg:pl-[190px]" aria-busy="true" aria-label={t('timeline.loading')}>
      {[0, 1, 2].map((i) => (
        <div key={i} className="mb-3 h-72 max-w-[448px] animate-pulse rounded-xl border border-line bg-panel" />
      ))}
    </div>
  );
}
