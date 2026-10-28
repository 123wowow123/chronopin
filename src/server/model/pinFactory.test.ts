import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
vi.mock('../db', () => ({ query: vi.fn() }));
import { factoryProblem } from './pinFactory';
import { FACTORY_KEYS, factoryScores, isFactoryScore, hasFactoryScores, hasFactoryRubric } from '@/lib/pinFactory';
import type { FactoryProfile } from '@/lib/pinFactory';
const catalog = JSON.parse(readFileSync('scripts/factories/capability.json', 'utf8')) as { key: string; profile: FactoryProfile }[];
const valid = () => structuredClone(catalog[0].profile);

describe('factory evidence contract', () => {
  it('shows the rubric only from three filled axes, counting a valid zero score', () => {
    const p = valid();
    for (const a of Object.values(p.axes)) a.score = null;
    expect(hasFactoryRubric(null)).toBe(false);
    expect(hasFactoryRubric(p)).toBe(false);
    for (const [index, key] of FACTORY_KEYS.entries()) {
      p.axes[key].score = index === 0 ? 0 : 3;
      expect(hasFactoryRubric(p)).toBe(index >= 2);
    }
  });
  it('validates buildout categories and preserves backwards-compatible payloads', () => {
    const p = valid();
    p.metrics[0].key = 'investment';
    p.metrics.push({ ...p.metrics[0] });
    expect(factoryProblem(p)).toMatch(/Duplicate factory metric/);
    p.metrics.pop();
    for (const m of p.metrics) delete m.key;
    delete p.milestones;
    expect(factoryProblem(p)).toEqual(p);
  });
  it('requires sourced milestones and distinguishes real events from future targets', () => {
    const p = valid();
    const source = p.metrics[0].source;
    p.milestones = [{ label: 'Announcement', date: '2026-10-02', basis: 'demonstrated', source }];
    expect(factoryProblem(p)).toEqual(p);
    p.milestones[0].date = '2027-01-01';
    expect(factoryProblem(p)).toMatch(/future/);
    p.milestones[0].basis = 'planned';
    expect(factoryProblem(p)).toEqual(p);
    p.milestones[0].date = '2027-02-30';
    expect(factoryProblem(p)).toMatch(/real/);
    p.milestones[0].date = 'Second half of 2029';
    expect(factoryProblem(p)).toEqual(p);
    p.milestones[0].source = { ...source, url: 'javascript:alert(1)' };
    expect(factoryProblem(p)).toMatch(/source/);
  });
  it('accepts the researched catalog and keeps missing figures null', () => {
    expect(catalog.length).toBeGreaterThanOrEqual(28);
    for (const { profile } of catalog) {
      expect(factoryProblem(profile)).toEqual(profile);
      expect(factoryScores(profile).scale).toBeNull();
      expect(factoryScores(profile).efficiency).toBeNull();
      // All-null research profiles are valid: they document gaps and still drive the buildout panel.
      expect(hasFactoryScores(profile)).toBe(Object.values(profile.axes).some(a => a.score !== null));
    }
  });
  it('requires all six axes but allows a useful all-unknown research profile', () => {
    const p = valid();
    for (const a of Object.values(p.axes)) Object.assign(a, { score: null, basis: 'unknown', sources: [] });
    expect(factoryProblem(p)).toEqual(p);
    expect(hasFactoryScores(p)).toBe(false);
    expect(factoryProblem({ ...p, axes: { ...p.axes, scale: undefined } })).toMatch(/scale/);
  });
  it('does not accept a score without evidence or substitute missing evidence for zero', () => {
    const p = valid(); p.axes.technical.sources = [];
    expect(factoryProblem(p)).toMatch(/evidence/);
    p.axes.technical.score = 0; p.axes.technical.basis = 'unknown';
    expect(factoryProblem(p)).toMatch(/evidence/);
    expect(isFactoryScore(0)).toBe(true);
    for (const bad of [5.5, -1, 2.1, NaN, Infinity, '4', undefined]) expect(isFactoryScore(bad)).toBe(false);
  });
  it('rejects unverified status, invalid days, missing sectors and unsupported editions', () => {
    expect(factoryProblem({ ...valid(), status: 'opened' })).toMatch(/status/);
    expect(factoryProblem({ ...valid(), sector: '' })).toMatch(/sector/);
    expect(factoryProblem({ ...valid(), assessmentDate: '2026-02-30' })).toMatch(/real/);
    expect(factoryProblem({ ...valid(), rubricYear: 2027 })).toMatch(/rubricYear/);
    expect(factoryProblem(null)).toMatch(/object/);
  });
  it('distinguishes installed capability from announcements and future metrics', () => {
    const p = valid(); p.axes.technical.basis = 'demonstrated';
    expect(factoryProblem(p)).toMatch(/announced/);
    p.axes.technical.basis = 'planned'; p.metrics[0].basis = 'demonstrated';
    expect(factoryProblem(p)).toMatch(/announced/);
  });
  it('requires a real comparison cohort for scale and efficiency', () => {
    const p = valid();
    p.axes.scale = { ...structuredClone(p.axes.technical), score: 5 };
    expect(factoryProblem(p)).toMatch(/benchmark/);
    p.axes.scale.benchmark = { cohortSize: 4, description: 'Four comparable factories', sources: p.axes.technical.sources };
    expect(factoryProblem(p)).toMatch(/five/);
    p.axes.scale.benchmark.cohortSize = 5;
    expect(factoryProblem(p)).toEqual(p);
  });
  it('rejects evidence from after the assessment date', () => {
    const p = valid(); p.axes.technical.sources[0].publishedDate = '2026-10-25';
    expect(factoryProblem(p)).toMatch(/postdate/);
  });
  it('requires exact-source metadata and safe HTTPS citation links', () => {
    for (const url of ['http://example.com', 'javascript:alert(1)', 'https://user:password@example.com']) {
      const p = valid(); p.axes.technical.sources[0].url = url;
      expect(factoryProblem(p)).toMatch(/HTTPS/);
    }
    const p = valid(); p.axes.technical.sources[0].publishedDate = '2026-02-30';
    expect(factoryProblem(p)).toMatch(/dates/);
    p.axes.technical.sources[0].publishedDate = null; p.axes.technical.sources[0].quote = 'x'.repeat(301);
    expect(factoryProblem(p)).toMatch(/300/);
  });
});
