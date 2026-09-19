import { beforeEach, describe, expect, it, vi } from 'vitest';

const claim = vi.fn();
const setting = vi.fn();
const lint = vi.fn();
vi.mock('../model/appSetting', () => ({ claimWikiRecheckRun: (day: string) => claim(day), getWikiRecheck: () => setting() }));
vi.mock('./okfLint', () => ({ runLint: (options: unknown) => lint(options) }));
vi.mock('../util/log', () => ({ default: { info: vi.fn(), warn: vi.fn() } }));

const { runNightlyRecheck } = await import('./wikiRecheckJob');

describe('runNightlyRecheck', () => {
  beforeEach(() => {
    claim.mockReset();
    lint.mockReset().mockResolvedValue({ stale: { notes: [], fixed: [] } });
    setting.mockReset();
  });

  it('does nothing while both options are off', async () => {
    setting.mockResolvedValue({ days: null, viewed: false });
    expect(await runNightlyRecheck(new Date('2026-09-20T00:05:00Z'))).toBe(false);
    expect(claim).not.toHaveBeenCalled();
  });

  it('claims the new UTC day and re-reads links of pins viewed before its midnight', async () => {
    setting.mockResolvedValue({ days: null, viewed: true });
    claim.mockResolvedValue(true);
    expect(await runNightlyRecheck(new Date('2026-09-20T00:05:00Z'))).toBe(true);
    expect(claim).toHaveBeenCalledWith('2026-09-20');
    expect(lint).toHaveBeenCalledWith({ checks: ['stale'], fix: true, viewedBefore: new Date('2026-09-20T00:00:00Z') });
  });

  it('leaves a day another server has claimed', async () => {
    setting.mockResolvedValue({ days: null, viewed: true });
    claim.mockResolvedValue(false);
    expect(await runNightlyRecheck(new Date('2026-09-20T13:00:00Z'))).toBe(false);
    expect(lint).not.toHaveBeenCalled();
  });
});
