'use client';

import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { useT } from '@/lib/client/i18n';
import type { AlternateNameJson } from '@/lib/alternateNames';
import { RefineLink } from './RefineLink';

const INITIAL_LIMIT = 6;

export function PinAlternateNames({
  names,
  className = '',
}: {
  names?: AlternateNameJson[];
  className?: string;
}) {
  const t = useT();
  const [expanded, setExpanded] = useState(false);

  if (!names?.length) return null;

  const shown = expanded ? names : names.slice(0, INITIAL_LIMIT);
  const remaining = names.length - INITIAL_LIMIT;

  return (
    <section aria-labelledby="alternate-names-heading" className={`text-sm ${className}`}>
      <div className="mb-2 flex items-center justify-between">
        <h2 id="alternate-names-heading" className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-subtle uppercase">
          <Icon name="globe" className="size-3.5 text-muted" />
          {t('pin.alternateNames')}
        </h2>
        <span className="rounded-full bg-field px-2 py-0.5 text-[10px] font-medium text-subtle ring-1 ring-line/50 ring-inset tabular-nums">
          {names.length}
        </span>
      </div>

      <div className="surface rounded-xl border border-line p-3">
        <ul className="flex flex-col divide-y divide-line/60">
          {shown.map((alt) => (
            <li key={`${alt.script}-${alt.name}`} className="flex items-center justify-between gap-3 py-1.5 first:pt-0 last:pb-0">
              <div className="min-w-0 flex-1">
                <RefineLink
                  field="tag"
                  value={alt.name}
                  title={alt.name}
                  className="block truncate text-xs font-medium text-ink transition-colors hover:text-link hover:no-underline"
                >
                  <span dir="auto">{alt.name}</span>
                </RefineLink>
              </div>
              <span className="shrink-0 rounded bg-field px-1.5 py-0.5 text-[10px] font-medium text-muted ring-1 ring-line/50 ring-inset">
                {alt.label}
              </span>
            </li>
          ))}
        </ul>

        {names.length > INITIAL_LIMIT ? (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="mt-2.5 flex w-full items-center justify-center gap-1 border-t border-line/60 pt-2 text-xs font-medium text-muted transition-colors hover:text-ink"
          >
            <span>{expanded ? t('pin.showFewerNames') : t('pin.showMoreNames', { count: remaining })}</span>
            <Icon name="chevron" className={`size-3 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
        ) : null}
      </div>
    </section>
  );
}

