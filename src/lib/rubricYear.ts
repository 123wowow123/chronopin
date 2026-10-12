// The year of the criteria an engineering performance rubric was scored
// against (PinCarPerf.rubricYear, 0169). Such a rubric anchors its scores to
// what is published today - a 2026 "5" for EV range is a 2028 "4" - so the
// anchors are re-baselined by edition and a score is only comparable with
// scores of the same year. A row keeps the year it was scored under; an older
// edition is labelled, never rescored silently. Shared by every engineering
// rubric (cars now; ships, aircraft or batteries when they get one) so each
// validates and draws the year the same way. Not for the taste radar, which
// is a judgement of flavour, not a spec benchmark.

export const RUBRIC_YEAR_MIN = 2020;
export const RUBRIC_YEAR_MAX = 2100;

export const isRubricYear = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= RUBRIC_YEAR_MIN && value <= RUBRIC_YEAR_MAX;

// The year in a request body: undefined when the body has none (null counts as
// none), so the caller decides what absent means - the current edition on an
// insert, the stored year on an update - or a sentence saying what is wrong.
export function rubricYearProblem(value: unknown): number | undefined | string {
  if (value === undefined || value === null) return undefined;
  if (!isRubricYear(value)) return `rubricYear must be a whole year from ${RUBRIC_YEAR_MIN} to ${RUBRIC_YEAR_MAX}.`;
  return value;
}
