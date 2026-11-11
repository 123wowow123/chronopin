import { describe, expect, it, vi } from 'vitest';
import { markFrontierByDate, matchModel, parseEciScores } from './eciParse';

vi.mock('./db', () => ({ query: vi.fn() }));

const csv = `Model,Display name,eci,eci_ci_low,eci_ci_high,date,Organization,Country (of organization),Model accessibility,Accessibility group,model_versions
a,Claude Opus 5,164.48,162.02,167.3,2026-07-24,Anthropic,US,API access,Closed weights,
b,Claude Opus 5.5,168.67,165.78,171.91,2026-09-22,Anthropic,US,API access,Closed weights,
c,Kimi K3,158.53,156.54,160.71,2026-07-16,Moonshot,CN,Open,Open weights,
d,No Score,,,,2026-01-01,X,US,API,Closed weights,
e,Old Model,120,,,2024-01-01,X,US,API,Closed weights,`;

describe('ECI scores', () => {
  const points = markFrontierByDate(parseEciScores(csv));
  it('skips rows without a score and marks open weights', () => {
    expect(points.map((p) => p.name)).toEqual(['Old Model', 'Kimi K3', 'Claude Opus 5', 'Claude Opus 5.5']);
    expect(points.find((p) => p.name === 'Kimi K3')?.open).toBe(true);
    expect(points.find((p) => p.name === 'Old Model')?.low).toBeNull();
  });
  it('marks a model frontier only when it beats every earlier one', () => {
    expect(points.map((p) => p.frontier)).toEqual([true, true, true, true]);
    const later = markFrontierByDate([...points, { ...points[0], key: 'x', name: 'X', eci: 100, date: '2026-10-01' }]);
    expect(later.find((p) => p.key === 'x')?.frontier).toBe(false);
  });
  it('matches the longest whole-word model name in a pin title', () => {
    expect(matchModel(points, 'Claude Opus 5.5 Released')?.name).toBe('Claude Opus 5.5');
    expect(matchModel(points, 'Claude Opus 5 Released')?.name).toBe('Claude Opus 5');
    expect(matchModel(points, 'Some Unrelated Pin')).toBeNull();
  });
});
