'use client';

import { useT } from '@/lib/client/i18n';
import { categoryLabel } from '@/lib/i18n/labels';

// A trending or new pin's main category, as a pill like the card's company
// one. It gives way first when the details line runs out of room.
export function CategoryPill({ category }: { category: string }) {
  const t = useT();
  return (
    <span className="min-w-0 truncate rounded-full bg-raised px-1.5 text-[11px] leading-4 font-medium text-muted ring-1 ring-tint/15 ring-inset">
      {categoryLabel(t, category)}
    </span>
  );
}
