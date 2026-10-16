import { describe, expect, it } from 'vitest';
import { campaignRefreshDue, cycleOf, displayName, latestQuarterlyDeadline, parseWeballLine } from './campaigns';

describe('quarterly deadlines', () => {
  it('finds the latest FEC deadline', () => {
    expect(latestQuarterlyDeadline(new Date('2026-10-16T12:00:00Z'))).toBe('2026-10-15');
    expect(latestQuarterlyDeadline(new Date('2026-01-10T12:00:00Z'))).toBe('2025-10-15');
    expect(latestQuarterlyDeadline(new Date('2026-02-01T00:00:00Z'))).toBe('2026-01-31');
  });
  it('runs once, after the grace days, per deadline', () => {
    expect(campaignRefreshDue(new Date('2026-10-16T08:00:00Z'), null).due).toBe(false);
    expect(campaignRefreshDue(new Date('2026-10-19T08:00:00Z'), '2026-07-15')).toEqual({ due: true, deadline: '2026-10-15' });
    expect(campaignRefreshDue(new Date('2026-10-25T08:00:00Z'), '2026-10-15').due).toBe(false);
  });
  it('names the two-year cycle', () => {
    expect(cycleOf(new Date('2025-03-01T00:00:00Z'))).toBe(2026);
    expect(cycleOf(new Date('2026-10-16T00:00:00Z'))).toBe(2026);
    expect(cycleOf(new Date('2027-01-31T00:00:00Z'))).toBe(2028);
  });
});

describe('FEC rows', () => {
  it('reads a weball line', () => {
    const r = parseWeballLine('H2AK01083|BEGICH, NICHOLAS III|I|2|REP|5470446.24|1601616.78|2455618.51|0|104330.06|3119157.79|0|0|0|199236.07|0|225763.93|2784023.76|AK|00||||||1028577|5000|07/29/2026|65885.84|4382.86');
    expect(r).toMatchObject({ fecCandidateId: 'H2AK01083', office: 'H', state: 'AK', status: 'I', receipts: 5470446.24, coverageEnd: '2026-07-29' });
    expect(displayName('PROVINCE, DANNY PAUL MR.')).toBe('Danny Paul Province');
  });
});
