'use client';

import type { ReactNode } from 'react';
import { useT } from '@/lib/client/i18n';
import { PillTip } from '@/components/ui/PillTip';
import { RefineLink } from './RefineLink';

// How firmly the source states a pin's date, as a coloured badge. Clicking it
// searches for pins at the same level (a confidence: term), like a card's
// category label. Hovering it explains the level and the scale it sits on;
// render DateConfidenceReasoning alongside to show why this pin got it.

// term: the confidence: search term's value, which stays English in any language.
const LEVELS: Record<string, { term: string; className: string }> = {
  delayed: { term: 'delayed', className: 'bg-red-500/15 text-danger-soft ring-red-500/30' },
  unknown: { term: 'unverified', className: 'bg-tint/5 text-muted ring-tint/10' },
  estimated: { term: 'estimated', className: 'bg-amber-500/15 text-warning-soft ring-amber-500/30' },
  scheduled: { term: 'scheduled', className: 'bg-sky-500/15 text-info-soft ring-sky-500/30' },
  confirmed: { term: 'confirmed', className: 'bg-emerald-500/15 text-success-soft ring-emerald-500/30' },
};

export function DateConfidence({ level }: { level?: string | null }) {
  const t = useT();
  const key = (level || '').toLowerCase();
  const meta = LEVELS[key];
  if (!meta) {
    return null;
  }
  const label = t.dynamic(`dateConfidence.${key}.label`, meta.term.toUpperCase());
  const title = t.dynamic(`dateConfidence.${key}.title`, '');
  return (
    <PillTip
      tip={
        <>
          <span className="block font-semibold text-ink">
            {t('dateConfidence.tipHeading')}: {label}
          </span>
          {title ? <span className="block">{title}</span> : null}
          <span className="block">{t('dateConfidence.tipScale')}</span>
          <span className="block text-subtle">{t('dateConfidence.showAll', { label })}</span>
        </>
      }
    >
      {(describedBy) => (
        <RefineLink
          field="confidence"
          value={meta.term}
          className={`pill-compact relative rounded-full px-2 py-px text-[10px] font-semibold tracking-wider not-italic ring-1 ring-inset after:absolute after:inset-x-0 after:-inset-y-1.5 after:content-[''] hover:no-underline hover:ring-current ${meta.className}`}
          describedBy={describedBy}
        >
          <span className="pill-label">{label}</span>
        </RefineLink>
      )}
    </PillTip>
  );
}

// The reasoning on a line of its own under the badges. Split out so a row with
// more badges after the level can keep them together and end with the reasoning.
export function DateConfidenceReasoning({ reasoning, dir, children }: { reasoning?: string | null; dir?: 'auto'; children?: ReactNode }) {
  if (!reasoning) {
    return null;
  }
  return (
    <span dir={dir} className="basis-full text-xs leading-relaxed text-subtle italic">
      {children ?? reasoning}
    </span>
  );
}
