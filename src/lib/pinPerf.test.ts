import { describe, expect, it } from 'vitest';
import { perfProblem } from './pinPerf';

const table = { title: 'Usage', columns: ['Measure', 'Figure', 'Basis'], rows: [['Users', '950 million', 'Google-wide']] };

describe('perfProblem tile tables', () => {
  it('keeps display: tiles on a three-column table', () => {
    const parsed = perfProblem({ tables: [{ ...table, display: 'tiles' }] });
    expect(typeof parsed).toBe('object');
    if (typeof parsed !== 'string') expect(parsed.tables[0].display).toBe('tiles');
  });
  it('drops it on any other shape and ignores unknown values', () => {
    const wide = perfProblem({ tables: [{ ...table, columns: ['a', 'b'], rows: [['x', 'y']], display: 'tiles' }] });
    if (typeof wide !== 'string') expect(wide.tables[0].display).toBeUndefined();
    const odd = perfProblem({ tables: [{ ...table, display: 'grid' }] });
    if (typeof odd !== 'string') expect(odd.tables[0].display).toBeUndefined();
  });
});
