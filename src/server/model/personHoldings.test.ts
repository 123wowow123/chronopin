import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { HoldingsSnapshot } from '@/lib/holdings';
const state = vi.hoisted(() => ({ current: [] as HoldingsSnapshot[], written: null as HoldingsSnapshot[] | null, locked: false }));
vi.mock('../db', () => ({
  query: vi.fn(async () => [{ portfolios: state.current }]),
  transaction: async (run: (q: (sql: string, args: unknown[]) => Promise<unknown[]>) => Promise<unknown>) => run(async (sql, args) => {
    if (sql.includes('FOR UPDATE')) { state.locked = true; return [{ id: 1 }]; }
    if (sql.startsWith('SELECT')) return [{ portfolios: state.current }];
    if (sql.startsWith('INSERT')) { expect(state.locked).toBe(true); state.written = JSON.parse(args[1] as string); return []; }
    throw new Error('Unexpected query');
  }),
}));
import PersonHoldings, { holdingsEtag } from './personHoldings';
import catalog from '../data/personHoldings.json';
import { readHoldings } from '../holdingsInput';
import { preferredHoldings } from '@/lib/holdings';

describe('holdings updates', () => {
  beforeEach(() => { state.current = preferredHoldings(readHoldings(catalog.profiles[0])); state.written = null; state.locked = false; });
  it('rejects an edit made after the caller read the snapshot', async () => {
    const tag = holdingsEtag(state.current);
    state.current[0].name += ' (revised)';
    expect(await PersonHoldings.save(1, 'Test', state.current, tag)).toBe(false);
    expect(state.written).toBeNull();
  });
  it('locks the person and merges just the supplied keys, retaining other sourced portfolios', async () => {
    const addition = structuredClone(state.current[0]); addition.name += ' (verified)';
    const others = state.current.slice(1);
    expect(await PersonHoldings.save(1, 'Test', [addition], holdingsEtag(state.current))).toBe(true);
    expect(state.written).toEqual([addition, ...others]);
  });
  it('refuses to replace newer disclosure evidence with an older snapshot', async () => {
    const addition = structuredClone(state.current[0]); addition.asOf = '2026-01-01';
    await expect(PersonHoldings.save(1, 'Test', [addition], holdingsEtag(state.current))).rejects.toThrow('newer evidence');
    expect(state.written).toBeNull();
  });
  it('keeps newly bundled primary sources visible alongside older saved strategy overrides', async () => {
    const strategy = structuredClone(state.current[0]);
    strategy.key = 'manual-strategy';
    state.current = [strategy];
    const saved = await PersonHoldings.forPerson(1, 'Warren Buffett');
    expect(saved.some(p => p.key === 'manual-strategy')).toBe(true);
    expect(saved.some(p => p.key === 'sec-13f-1067983')).toBe(true);
    expect(saved.some(p => p.key === 'berkshire-annual-costs-2025')).toBe(true);
    expect(saved[0].scope).toBe('fund');
  });
});
