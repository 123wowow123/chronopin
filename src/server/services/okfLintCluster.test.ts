import { beforeEach, describe, expect, it, vi } from 'vitest';

const query = vi.fn();
const replace = vi.fn();
vi.mock('../db', () => ({ query: (sql: string, params: unknown[]) => query(sql, params), transaction: vi.fn() }));
vi.mock('../model/okfLint', () => ({ default: { replace: (...args: unknown[]) => replace(...args) } }));
vi.mock('../util/log', () => ({ default: { info: vi.fn(), warn: vi.fn() } }));

const { runLint } = await import('./okfLint');

// The cluster check's discriminator is in SQL, so what a mocked test can pin is
// the contract around it: the thresholds actually reach the query, and a
// flagged day becomes one warning per pin that says why. The discriminator
// itself was checked against the live corpus both ways - silent on the real
// data, and firing exactly once on the 2026-09-08 state restored inside a
// rolled-back transaction (docs/okf/scraping/learnings.md).
describe('cluster lint', () => {
  beforeEach(() => {
    query.mockReset().mockResolvedValue([]);
    replace.mockReset();
  });

  it('asks for volume, several hosts and a confirmed majority, and skips year placeholders', async () => {
    await runLint({ checks: ['cluster'] });
    const [sql, params] = query.mock.calls[0];
    expect(sql).toContain('dateConfidence');
    // 12-31 and 01-01 are the house's year placeholders, never a cluster.
    expect(params.slice(0, 2)).toEqual(['12-31', '01-01']);
    // min pins, min distinct hosts, min confirmed share.
    expect(params.slice(3)).toEqual([8, 4, 0.6]);
  });

  it('reports every pin of a flagged day, saying how the day looks', async () => {
    query.mockResolvedValue([
      { day: '2026-09-08', userId: 22, userName: '@GameDesk', n: 71, hosts: 50, confirmed: 71, ids: [309, 310, 311] },
    ]);
    const report = await runLint({ checks: ['cluster'] });
    const findings = report.cluster!.findings;
    expect(findings.map((f) => f.pinId)).toEqual([309, 310, 311]);
    expect(findings.every((f) => f.severity === 'warning' && f.check === 'cluster')).toBe(true);
    expect(findings[0].message).toContain("71 of @GameDesk's pins start on 2026-09-08");
    expect(findings[0].message).toContain('50 different sites');
    expect(replace).toHaveBeenCalledWith('cluster', findings, undefined);
  });

  it('says so when a corpus has no suspicious day', async () => {
    const report = await runLint({ checks: ['cluster'] });
    expect(report.cluster!.findings).toEqual([]);
    expect(report.cluster!.notes).toEqual(['no suspicious date clusters']);
  });
});
