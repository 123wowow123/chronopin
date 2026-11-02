import { describe, expect, it } from 'vitest';
import { perfProblem, timelineSpan } from './pinPerf';

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

describe('perfProblem timeline tables', () => {
  const timeline = {
    title: 'Production status',
    display: 'timeline',
    stages: ['Announced', 'Tape-out', 'Volume'],
    current: 1,
    columns: ['Date', 'Milestone', 'Status', 'Source'],
    rows: [['Apr 15, 2026', 'Tape-out announced', 'Demonstrated', 'Wccftech']],
  };
  it('keeps stages and the reached stage on a four-column timeline', () => {
    const parsed = perfProblem({ tables: [timeline] });
    expect(typeof parsed).toBe('object');
    if (typeof parsed !== 'string') expect(parsed.tables[0]).toMatchObject({ display: 'timeline', stages: timeline.stages, current: 1 });
  });
  it('rejects the wrong width, a stage index out of range and a translation with other stages', () => {
    expect(perfProblem({ tables: [{ ...timeline, columns: ['a', 'b', 'c'], rows: [['x', 'y', 'z']] }] })).toMatch(/four columns/);
    expect(perfProblem({ tables: [{ ...timeline, current: 3 }] })).toMatch(/current/);
    const i18n = { es: { title: 'Estado', columns: timeline.columns, rows: timeline.rows, stages: ['Uno'] } };
    expect(perfProblem({ tables: [{ ...timeline, i18n }] })).toMatch(/stages/);
  });
});

describe('timelineSpan', () => {
  const row = (date: string) => [date, 'm', 'Planned', 'S'];
  const perf = (rows: string[][]) => ({ charts: [], checkedAt: '', tables: [{ title: 't', display: 'timeline' as const, columns: ['Date', 'Milestone', 'Status', 'Source'], rows }] });
  it('runs from the earliest placeable row to the latest', () => {
    const span = timelineSpan(perf([row('Mar 2026'), row('H2 2027'), row('2028')]));
    expect(span?.start).toBe(Date.UTC(2026, 2, 1));
    expect(span?.end).toBe(Date.UTC(2028, 11, 31));
    expect(span?.marks).toHaveLength(2);
  });
  it('needs two placeable rows', () => {
    expect(timelineSpan(perf([row('Mar 2026'), row('H2 2027')]))).toBeNull();
  });
});
