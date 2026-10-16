import { describe, expect, it } from 'vitest';
import { searchClauses, type SearchFilter } from './pins';
import { RUBRIC_TABLES, rubricYearClause } from '../util/rubricSearch';
import { parseSearchQuery } from '../util/searchQuery';

// The SQL a search's rubric: and carperf: terms make, off the same parse the
// search service uses.
function clauses(q: string) {
  const filter = { ...parseSearchQuery(q), hits: null } as unknown as SearchFilter;
  return searchClauses(filter);
}

describe('rubricYearClause', () => {
  it('asks each engineering rubric table for a row of the year', () => {
    const sql = rubricYearClause('$3');
    for (const table of RUBRIC_TABLES) expect(sql).toContain(`FROM "${table}" AS "r" WHERE "r"."pinId" = "Pin"."id" AND "r"."rubricYear" = ANY($3::integer[])`);
  });

  it('is a bare EXISTS for one rubric table and an OR of them for several', () => {
    expect(rubricYearClause('$1', '"p"."id"')).toMatch(/^EXISTS \(SELECT 1 FROM "PinCarPerf" AS "r" WHERE "r"\."pinId" = "p"\."id"/);
    const both = rubricYearClause('$1', '"Pin"."id"', ['PinCarPerf', 'PinShipPerf']);
    expect(both).toMatch(/^\(EXISTS \(SELECT 1 FROM "PinCarPerf".*\) OR EXISTS \(SELECT 1 FROM "PinShipPerf".*\)\)$/);
  });
});

describe('searchClauses rubric:', () => {
  it('adds no clause without a rubric: term', () => {
    const { where, params } = clauses('carperf:any');
    expect(where.some((w) => w.includes('rubricYear'))).toBe(false);
    expect(params).toEqual([]);
  });

  it('matches pins with a rubric of the year, any of the years given', () => {
    const { where, params } = clauses('rubric:2026 rubric:2027');
    const clause = where.find((w) => w.includes('rubricYear'))!;
    expect(clause).toMatch(/EXISTS \(SELECT 1 FROM "PinCarPerf" AS "r" WHERE "r"\."pinId" = "Pin"\."id" AND "r"\."rubricYear" = ANY\(\$1::integer\[\]\)\)/);
    expect(params).toEqual([[2026, 2027]]);
  });

  it('leaves out a year the criteria never had, so it adds no clause', () => {
    const { where, params } = clauses('rubric:1999');
    expect(where.some((w) => w.includes('rubricYear'))).toBe(false);
    expect(params).toEqual([]);
  });

  it('reads the year off the same car rubric the carperf: axes score', () => {
    const { where, params } = clauses('carperf:range rubric:2026');
    const rubric = where.filter((w) => w.includes('rubricYear'));
    expect(rubric).toHaveLength(1);
    expect(rubric[0]).toContain('"c"."range" >= ');
    expect(rubric[0]).toContain('"c"."rubricYear" = ANY($1::integer[])');
    expect(rubric[0]).not.toContain('"r"');
    expect(params).toEqual([[2026]]);
  });

  it('keeps carperf:any a bare rubric match for the year', () => {
    const { where } = clauses('carperf:any rubric:2026');
    const rubric = where.filter((w) => w.includes('rubricYear'));
    expect(rubric).toHaveLength(1);
    expect(rubric[0]).toContain('"c"."pinId" = "Pin"."id" AND TRUE AND "c"."rubricYear" = ANY($1::integer[])');
  });

  it('composes with the other terms as its own clause', () => {
    const { where, params } = clauses('rubric:2026 place:Chicago');
    expect(where.filter((w) => w.includes('rubricYear'))).toHaveLength(1);
    expect(where.some((w) => w.includes('"Pin"."address"'))).toBe(true);
    expect(params).toContainEqual([2026]);
  });
});

describe('searchClauses watch view', () => {
  it('includes watched pins and predicted pins of followed companies in the watch view', () => {
    const filter = { ...parseSearchQuery('company:Anthropic'), hits: null, favoriteUserId: 42 } as unknown as SearchFilter;
    const { where, params } = searchClauses(filter);
    const watchClause = where.find((w) => w.includes('"Favorite"'))!;
    expect(watchClause).toContain('FROM "Favorite" AS "Favorites"');
    expect(watchClause).toContain('FROM "CompanyFollow" AS "cf"');
    expect(watchClause).toContain(`"pt"."name" = 'Predicted'::citext`);
    expect(params).toEqual([['Anthropic'], 42]);
  });

  it('omits followed-company predicted pins and excludes predicted pins when excludePredicted is true', () => {
    const filter = {
      ...parseSearchQuery('company:Anthropic'),
      hits: null,
      favoriteUserId: 42,
      excludePredicted: true,
    } as unknown as SearchFilter;
    const { where, params } = searchClauses(filter);
    const watchClause = where.find((w) => w.includes('"Favorite"'))!;
    expect(watchClause).toContain('FROM "Favorite" AS "Favorites"');
    expect(watchClause).not.toContain('"CompanyFollow"');
    expect(where.some((w) => w.startsWith('NOT EXISTS (SELECT 1 FROM "PinTagView"'))).toBe(true);
    expect(params).toEqual([['Anthropic'], 42]);
  });
});
