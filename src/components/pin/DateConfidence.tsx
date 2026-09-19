'use client';

import type { ReactNode } from 'react';
import { useT } from '@/lib/client/i18n';
import { RefineLink } from './RefineLink';

// How firmly the source states a pin's date, as a coloured badge. Clicking it
// searches for pins at the same level (a confidence: term), like a card's
// category label. The reasoning only fills in the badge's title here; render
// DateConfidenceReasoning alongside to show it.

// term: the confidence: search term's value, which stays English in any language.
const LEVELS: Record<string, { term: string; className: string }> = {
  delayed: { term: 'delayed', className: 'bg-red-500/15 text-danger-soft ring-red-500/30' },
  unknown: { term: 'unverified', className: 'bg-tint/5 text-muted ring-tint/10' },
  estimated: { term: 'estimated', className: 'bg-amber-500/15 text-warning-soft ring-amber-500/30' },
  scheduled: { term: 'scheduled', className: 'bg-sky-500/15 text-info-soft ring-sky-500/30' },
  confirmed: { term: 'confirmed', className: 'bg-emerald-500/15 text-success-soft ring-emerald-500/30' },
};

export function DateConfidence({ level, reasoning }: { level?: string | null; reasoning?: string | null }) {
  const t = useT();
  const key = (level || '').toLowerCase();
  const meta = LEVELS[key];
  if (!meta) {
    return null;
  }
  const label = t.dynamic(`dateConfidence.${key}.label`, meta.term.toUpperCase());
  const title = t.dynamic(`dateConfidence.${key}.title`, '');
  return (
    <RefineLink
      field="confidence"
      value={meta.term}
      className={`relative rounded-full px-2 py-px text-[10px] font-semibold tracking-wider not-italic ring-1 ring-inset after:absolute after:inset-x-0 after:-inset-y-1.5 after:content-[''] hover:no-underline hover:ring-current ${meta.className}`}
      title={`${title}${reasoning ? ` — ${reasoning}` : ''}\n${t('dateConfidence.showAll', { label })}`}
    >
      {label}
    </RefineLink>
  );
}

// The reasoning on a line of its own under the badges. Split out so a row with
// more badges after the level can keep them together and end with the reasoning.
export function DateConfidenceReasoning({ reasoning, children }: { reasoning?: string | null; children?: ReactNode }) {
  if (!reasoning) {
    return null;
  }
  return <span className="basis-full text-xs leading-relaxed text-subtle italic">{children ?? reasoning}</span>;
}
