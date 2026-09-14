// How firmly the source states a pin's date, as a coloured badge.

const LEVELS: Record<string, { label: string; title: string; className: string }> = {
  delayed: { label: 'DELAYED', title: 'The date has moved', className: 'bg-red-900/70 text-red-200' },
  unknown: { label: 'UNVERIFIED', title: 'No wording about the date was found', className: 'bg-neutral-700 text-neutral-300' },
  estimated: { label: 'ESTIMATED', title: 'A target, not a fixed date', className: 'bg-amber-900/70 text-amber-200' },
  scheduled: { label: 'SCHEDULED', title: 'Given as scheduled', className: 'bg-sky-900/70 text-sky-200' },
  confirmed: { label: 'CONFIRMED', title: 'Stated as firm', className: 'bg-green-900/70 text-green-300' },
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
        className={`rounded px-1.5 py-px text-[10px] font-bold tracking-wide italic ${meta.className}`}
        title={`${meta.title}${reasoning ? ` — ${reasoning}` : ''}`}
      >
        {meta.label}
      </span>
      {showReasoning && reasoning ? <span className="basis-full text-xs text-subtle italic">{reasoning}</span> : null}
    </>
  );
}
