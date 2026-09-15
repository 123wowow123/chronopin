import type { ReactNode } from 'react';
import { RefineLink } from './RefineLink';

// How firmly the source states a pin's date, as a coloured badge. Clicking it
// searches for pins at the same level (a confidence: term), like a card's
// category label.
// reasoningContent, when given, is shown in place of the plain reasoning (the
// same text with citations).

const LEVELS: Record<string, { label: string; title: string; className: string }> = {
  delayed: { label: 'DELAYED', title: 'The date has moved', className: 'bg-red-500/15 text-danger-soft ring-red-500/30' },
  unknown: { label: 'UNVERIFIED', title: 'No wording about the date was found', className: 'bg-tint/5 text-muted ring-tint/10' },
  estimated: { label: 'ESTIMATED', title: 'A target, not a fixed date', className: 'bg-amber-500/15 text-warning-soft ring-amber-500/30' },
  scheduled: { label: 'SCHEDULED', title: 'Given as scheduled', className: 'bg-sky-500/15 text-info-soft ring-sky-500/30' },
  confirmed: { label: 'CONFIRMED', title: 'Stated as firm', className: 'bg-emerald-500/15 text-success-soft ring-emerald-500/30' },
};

export function DateConfidence({
  level,
  reasoning,
  showReasoning,
  reasoningContent,
}: {
  level?: string | null;
  reasoning?: string | null;
  showReasoning?: boolean;
  reasoningContent?: ReactNode;
}) {
  const meta = LEVELS[(level || '').toLowerCase()];
  if (!meta) {
    return null;
  }
  return (
    <>
      <RefineLink
        field="confidence"
        value={meta.label.toLowerCase()}
        className={`relative rounded-full px-2 py-px text-[10px] font-semibold tracking-wider not-italic ring-1 ring-inset after:absolute after:inset-x-0 after:-inset-y-1.5 after:content-[''] hover:no-underline hover:ring-current ${meta.className}`}
        title={`${meta.title}${reasoning ? ` — ${reasoning}` : ''}\nShow all ${meta.label} pins`}
      >
        {meta.label}
      </RefineLink>
      {showReasoning && reasoning ? <span className="basis-full text-xs leading-relaxed text-subtle italic">{reasoningContent ?? reasoning}</span> : null}
    </>
  );
}
