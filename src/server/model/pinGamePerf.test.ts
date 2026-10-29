import { describe, expect, it } from 'vitest';
import { gamePerfProblem } from './pinGamePerf';

describe('gamePerfProblem', () => {
  const ok = { gameplay: 4.5, story: null, visuals: 5, rubricYear: 1995 };
  it('takes half-step scores, nulls and an era year', () => {
    const r = gamePerfProblem(ok);
    expect(typeof r).toBe('object');
    if (typeof r === 'object') expect(r.rubricYear).toBe(1995);
  });
  it('requires the release year, not a current edition', () => {
    expect(gamePerfProblem({ gameplay: 4 })).toMatch(/rubricYear/);
    expect(gamePerfProblem({ gameplay: 4, rubricYear: 1950 })).toMatch(/rubricYear/);
  });
  it('rejects quarter steps, out-of-range scores and an all-null rubric', () => {
    expect(gamePerfProblem({ ...ok, audio: 3.3 })).toMatch(/audio/);
    expect(gamePerfProblem({ ...ok, polish: 6 })).toMatch(/polish/);
    expect(gamePerfProblem({ rubricYear: 2001 })).toMatch(/one axis/);
  });
});
