import { describe, expect, it } from 'vitest';
import { blendedPrice, markFrontier, modelKey, showPrice, type ModelPoint } from './modelChart';

describe('modelKey', () => {
  it('joins the arena name and the router slug', () => {
    expect(modelKey('claude-opus-4-6-high')).toBe('claude opus 4.6');
    expect(modelKey('anthropic/claude-opus-4.6')).toBe('claude opus 4.6');
    expect(modelKey('claude-opus-4-5-20251101-thinking-32k')).toBe('claude opus 4.5');
    expect(modelKey('o3-2025-04-16')).toBe('o3');
    expect(modelKey('muse-spark-1.2 (xHigh)')).toBe('muse spark 1.2');
    expect(modelKey('google/gemini-3-flash-preview:batch')).toBe('gemini 3 flash');
  });
  it('keeps a size suffix apart from the version', () => {
    expect(modelKey('granite-4.2-8b')).toBe('granite 4.2 8b');
    expect(modelKey('gemma-3-4b-it')).toBe('gemma 3 4b it');
    expect(modelKey('llama-3.1-8b-instruct')).toBe('llama 3.1 8b instruct');
    expect(modelKey('command-r-plus-08-2024')).toBe('command r plus');
    expect(modelKey('claude-3-5-sonnet')).toBe('claude 3.5 sonnet');
    expect(modelKey('gemini-2-5-pro')).toBe('gemini 2.5 pro');
  });
  it('keeps medium in Mistral names but not as an effort suffix', () => {
    expect(modelKey('mistral-medium-2508')).toBe('mistral medium');
    expect(modelKey('mistral-medium-3.5')).toBe('mistral medium 3.5');
    expect(modelKey('gemini-3.5-flash-medium')).toBe('gemini 3.5 flash');
  });
  it('reads a title-spaced name the same way', () => {
    expect(modelKey('o 3')).toBe('o3');
    expect(modelKey('deepseek v 3.1')).toBe('deepseek v3.1');
    expect(modelKey('gpt 5.2 thinking')).toBe('gpt 5.2');
  });
});

describe('blendedPrice', () => {
  it('weights input five to one', () => {
    expect(blendedPrice(0.000001, 0.000006)).toBeCloseTo(1.833, 2);
  });
});

describe('markFrontier', () => {
  const p = (key: string, price: number, elo: number): ModelPoint => ({ key, name: key, organization: null, elo, price, year: 2026 });
  it('keeps the points nothing cheaper beats', () => {
    const out = markFrontier([p('a', 1, 1400), p('b', 2, 1390), p('c', 3, 1450), p('d', 3, 1440)]);
    expect(out.filter((x) => x.frontier).map((x) => x.key)).toEqual(['a', 'c']);
  });
});

describe('showPrice', () => {
  it('rounds to a readable figure', () => {
    expect(showPrice(0.4)).toBe('$0.40');
    expect(showPrice(2)).toBe('$2');
    expect(showPrice(12.4)).toBe('$12');
  });
});
