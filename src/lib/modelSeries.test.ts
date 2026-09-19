import { describe, expect, it } from 'vitest';
import { compareVersions, modelRelease, modelReleases } from './modelSeries';

describe('modelRelease', () => {
  it.each([
    ['Claude Opus 4.5 Released', 'claude opus', [4, 5], 'claude opus 4.5'],
    ['Anthropic Releases Claude 3.5 Sonnet', 'claude sonnet', [3, 5], 'claude sonnet 3.5'],
    ['GPT-4o Update Rolls Out in ChatGPT', 'gpt', [4], 'gpt 4o'],
    ['GPT 4o-mini Updated', 'gpt mini', [4], 'gpt 4o mini'],
    ['GPT-4.1 mini Replaces GPT-4o mini', 'gpt mini', [4, 1], 'gpt 4.1 mini'],
    ['GPT‑5.3‑Codex Released', 'gpt codex', [5, 3], 'gpt 5.3 codex'],
    ['GPT-5-Codex-Max Released', 'gpt codex max', [5], 'gpt 5 codex max'],
    ['GPT-5.2 Thinking Gets Thinking-Time Settings', 'gpt', [5, 2], 'gpt 5.2 thinking'],
    ['GPT-5.6 Sol Rolls Out in ChatGPT', 'gpt', [5, 6], 'gpt 5.6 sol'],
    ['GPT-5.3 Instant Update', 'gpt instant', [5, 3], 'gpt 5.3 instant'],
    ['OpenAI o3-pro Released', 'o pro', [3], 'o 3 pro'],
    ['OpenAI o3 and o4-mini Released', 'o', [3], 'o 3'],
    ['OpenAI Releases gpt-oss-120b and gpt-oss-20b', 'gpt-oss', [0], 'gpt-oss 0'],
    ['Gemini 2.5 Pro Released', 'gemini pro', [2, 5], 'gemini 2.5 pro'],
  ])('%s', (title, line, version, model) => {
    expect(modelRelease(title)).toEqual({ line, version, model });
  });

  it('threads nothing that names no known model line', () => {
    expect(modelRelease('Anthropic Expected to Release Its Next Claude Opus Model')).toBeUndefined();
    expect(modelRelease('OpenAI pauses new $200 ChatGPT Pro sign-ups')).toBeUndefined();
    expect(modelRelease('Updates to the OpenAI Model Spec')).toBeUndefined();
    expect(modelRelease('Photo op on 3rd Street')).toBeUndefined();
  });
});

describe('modelReleases', () => {
  it('names every model in the title, first first', () => {
    expect(modelReleases('OpenAI o3 and o4-mini Released').map((r) => r.model)).toEqual(['o 3', 'o 4 mini']);
    expect(modelReleases('GPT-4.1 mini Replaces GPT-4o mini in ChatGPT').map((r) => r.model)).toEqual(['gpt 4.1 mini', 'gpt 4o mini']);
    expect(modelReleases('Claude Opus 4.5 Released')).toHaveLength(1);
  });
});

describe('compareVersions', () => {
  it('compares part by part', () => {
    expect(compareVersions([4, 5], [4, 6])).toBeLessThan(0);
    expect(compareVersions([5], [4, 8])).toBeGreaterThan(0);
    expect(compareVersions([4], [4, 0])).toBe(0);
  });
});
