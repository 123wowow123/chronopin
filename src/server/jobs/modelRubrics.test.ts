import { afterEach, describe, expect, it, vi } from 'vitest';
import * as db from '../db';
import { perfForPin } from '../model/pinPerf';
import { modelPerformanceUpdate, modelRubricGaps } from './modelRubrics';

vi.mock('../db', () => ({ query: vi.fn() }));
vi.mock('../model/pinPerf', () => ({ perfForPin: vi.fn() }));
afterEach(() => vi.resetAllMocks());

const chart = { title: 'Terminal-Bench 4.0', unit: '%', sourceUrl: 'https://maker.example/benchmarks', bars: [{ label: 'Previous model', value: 57.1 }, { label: 'New model', value: 65.2, highlight: true }] };
const table = { title: 'Launch specs', columns: ['Spec', 'Value'], rows: [['Context', '1M tokens']], sourceUrl: 'https://maker.example/specs' };

describe('model enrichment gaps', () => {
  it('finds an announced language model with an existing rubric but missing graphs/tables and images', async () => {
    vi.mocked(db.query).mockResolvedValue([
      { id: 1, title: 'Google Announces Gemini 4 Carbon with Cybersecurity Focus', start: new Date('2026-10-28'), author: '@Owner', hasLlm: true, hasVideo: false, hasTables: false, hasImage: false, predicted: false },
      { id: 2, title: 'Veo 3.1 Released', start: new Date('2026-10-27'), author: '@AIDesk', hasLlm: false, hasVideo: true, hasTables: true, hasImage: true, predicted: false },
      { id: 3, title: 'Grok 4.7 Released', start: new Date('2026-10-26'), author: '@AIDesk', hasLlm: false, hasVideo: false, hasTables: false, hasImage: false, predicted: true },
    ]);
    expect(await modelRubricGaps()).toEqual({ gaps: [{ pinId: 1, title: 'Google Announces Gemini 4 Carbon with Cybersecurity Focus', kind: 'llm', start: '2026-10-28', author: '@Owner', needs: ['tables', 'media'] }], remaining: 0 });
    expect(await modelRubricGaps(5, [1])).toEqual({ gaps: [], remaining: 0 });
  });

  it('finds media gaps even when the model has every panel', async () => {
    vi.mocked(db.query).mockResolvedValue([{ id: 1, title: 'Grok 4.7 Released', start: new Date('2026-10-28'), hasLlm: true, hasTables: true, hasImage: false, author: '@AIDesk' }]);
    expect((await modelRubricGaps()).gaps[0].needs).toEqual(['media']);
  });
});

describe('updating model specifications', () => {
  it('keeps existing graphs when adding tables', async () => {
    vi.mocked(perfForPin).mockResolvedValue({ charts: [chart], tables: [], checkedAt: '2026-10-28' });
    expect(await modelPerformanceUpdate(1, { tables: [table] })).toEqual({ charts: [chart], tables: [table] });
  });

  it('keeps existing tables when adding graphs', async () => {
    vi.mocked(perfForPin).mockResolvedValue({ charts: [], tables: [table], checkedAt: '2026-10-28' });
    expect(await modelPerformanceUpdate(1, { charts: [chart] })).toEqual({ charts: [chart], tables: [table] });
  });

  it('refuses unsourced graphs and invalid empty updates', async () => {
    await expect(modelPerformanceUpdate(1, { charts: [{ ...chart, sourceUrl: undefined }] })).rejects.toThrow(/HTTPS/);
    await expect(modelPerformanceUpdate(1, {})).rejects.toThrow(/Send charts or tables/);
    await expect(modelPerformanceUpdate(1, { charts: [{ ...chart, bars: [{ label: 'Only model', value: 59 }] }] })).rejects.toThrow(/needs 2/);
  });
});
