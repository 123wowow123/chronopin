// The rubric: search term (rubric:2026), in SQL: the pins whose engineering
// performance rubric was scored against a given edition of the criteria
// (src/lib/rubricYear.ts). Every engineering rubric table carries "pinId" and
// "rubricYear", so a later rubric (ships, aircraft, batteries) joins the term
// by being added to RUBRIC_TABLES, here and nowhere else: the term then finds
// a pin scored against that year by any of them. The taste radar is a
// judgement of flavour and has no year, so it is not one.

// The tables of the engineering rubrics, each with "pinId" and "rubricYear".
export const RUBRIC_TABLES = ['PinCarPerf'] as const;

// A pin having a rubric of any of these years: an EXISTS per rubric table, or
// them together. `years` is the SQL placeholder (or expression) of an integer
// array of years, already validated by the caller (isRubricYear); `pin` is
// the pin id's column; `tables` is for tests.
export function rubricYearClause(years: string, pin = '"Pin"."id"', tables: readonly string[] = RUBRIC_TABLES): string {
  const exists = tables.map((table) => `EXISTS (SELECT 1 FROM "${table}" AS "r" WHERE "r"."pinId" = ${pin} AND "r"."rubricYear" = ANY(${years}::integer[]))`);
  return exists.length === 1 ? exists[0] : `(${exists.join(' OR ')})`;
}
