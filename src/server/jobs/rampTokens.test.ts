import { describe, expect, it } from 'vitest';
import { assertPlausibleUsage, usageLines } from './rampTokens';

const row = (period_end: string, model_maker: string, metric_value: number) => ({ period_end, metric_key: 'token_volume', model_maker, metric_value });

describe('rampTokens', () => {
  it('keeps feed values that are already in trillions', () => {
    const lines = usageLines([row('2026-11-15', 'anthropic', 164), row('2026-11-15', 'openai', 104)], 'token_volume', 1, 2);
    expect(lines[0].points[0].value).toBe(268);
  });

  it('rejects lines flattened to zero by a wrong scale', () => {
    const flat = usageLines([row('2026-11-08', 'openai', 200), row('2026-11-15', 'openai', 276)], 'token_volume', 1e12, 2);
    expect(() => assertPlausibleUsage('ramp-token-volume', flat)).toThrow(/looks wrong/);
  });

  it('accepts a growing series', () => {
    const ok = usageLines([row('2026-11-08', 'openai', 200), row('2026-11-15', 'openai', 276)], 'token_volume', 1, 2);
    expect(() => assertPlausibleUsage('ramp-token-volume', ok)).not.toThrow();
  });
});
