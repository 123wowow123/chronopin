import { RefineLink } from './RefineLink';

// The small "2026 criteria" pill in the header of an engineering performance
// rubric (PinCarPerf now; any later ship, aircraft or battery rubric): which
// year's edition of the anchors the scores were set against, since the
// anchors are tightened over time (src/lib/rubricYear.ts). It is a search
// link, like the rubric's heading and axis labels: it finds every pin scored
// against that year's criteria (rubric:2026), added to the search already
// showing on the search page. Takes the already localized label and title so
// each rubric keeps its own strings; the year stays a string for the term.
export function RubricYearPill({ year, label, title }: { year: number | string; label: string; title: string }) {
  return (
    <RefineLink
      field="rubric"
      value={String(year)}
      title={title}
      className="rounded-full bg-raised px-2 py-px text-[0.625rem] font-medium tracking-wide text-muted ring-1 ring-line ring-inset hover:text-link hover:no-underline"
    >
      {label}
    </RefineLink>
  );
}
