import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildFactoryProfile, factoryEvidenceProblem } from './factoryProfiles';
import type { FactoryProfile } from '@/lib/pinFactory';

const entries = JSON.parse(readFileSync('scripts/factories/capability.json', 'utf8')) as { key: string; profile: FactoryProfile }[];
const audi = entries.find((e) => e.key === 'audi')!.profile;
const urls = [...new Set([...audi.metrics.map((m) => m.source.url), ...(audi.milestones ?? []).map((m) => m.source.url)])];

describe('factory profile task helpers', () => {
  it('accepts a profile whose pages the pin already cites', () => {
    expect(factoryEvidenceProblem(audi, urls)).toBeNull();
  });
  it('names the pages the pin does not cite yet', () => {
    expect(factoryEvidenceProblem(audi, [])).toContain(urls[0]);
  });
  it('fills the run defaults and forces a session profile', () => {
    const { source: _s, rubricYear: _r, assessmentDate: _a, ...input } = audi;
    const built = buildFactoryProfile({ ...input, source: 'hand' }, '2026-10-27');
    expect(built).toMatchObject({ source: 'session', rubricYear: 2026, assessmentDate: '2026-10-27' });
  });
  it('refuses an invalid profile with the endpoint\'s message', () => {
    expect(typeof buildFactoryProfile({ sector: 'x' }, '2026-10-27')).toBe('string');
  });
});
