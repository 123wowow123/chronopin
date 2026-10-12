// The small "2026 criteria" pill in the header of an engineering performance
// rubric (PinCarPerf now; any later ship, aircraft or battery rubric): which
// year's edition of the anchors the scores were set against, since the
// anchors are tightened over time (src/lib/rubricYear.ts). Takes the already
// localized label so each rubric keeps its own strings.
export function RubricYearPill({ label }: { label: string }) {
  return <span className="rounded-full bg-raised px-2 py-px text-[0.625rem] font-medium tracking-wide text-muted ring-1 ring-line ring-inset">{label}</span>;
}
