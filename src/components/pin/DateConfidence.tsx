// How firmly the source states a pin's date, as a coloured badge.

const LEVELS: Record<string, { label: string; title: string; className: string }> = {
  delayed: { label: 'DELAYED', title: 'The date has moved', className: 'bg-red-500/15 text-red-300 ring-red-500/30' },
  unknown: { label: 'UNVERIFIED', title: 'No wording about the date was found', className: 'bg-white/5 text-muted ring-white/10' },
  estimated: { label: 'ESTIMATED', title: 'A target, not a fixed date', className: 'bg-amber-500/15 text-amber-300 ring-amber-500/30' },
  scheduled: { label: 'SCHEDULED', title: 'Given as scheduled', className: 'bg-sky-500/15 text-sky-300 ring-sky-500/30' },
  confirmed: { label: 'CONFIRMED', title: 'Stated as firm', className: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30' },
};

export function DateConfidence({
  level,
  reasoning,
  showReasoning,
}: {
  level?: string | null;
  reasoning?: string | null;
  showReasoning?: boolean;
}) {
  const meta = LEVELS[(level || '').toLowerCase()];
  if (!meta) {
    return null;
  }
  return (
    <>
      <span
        className={`rounded-full px-2 py-px text-[10px] font-semibold tracking-wider not-italic ring-1 ring-inset ${meta.className}`}
        title={`${meta.title}${reasoning ? ` — ${reasoning}` : ''}`}
      >
        {meta.label}
      </span>
      {showReasoning && reasoning ? <span className="basis-full text-xs leading-relaxed text-subtle italic">{reasoning}</span> : null}
    </>
  );
}
