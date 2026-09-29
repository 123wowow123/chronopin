import { describe, expect, it } from 'vitest';
import { quickStep } from './quickPin';

const ready = { title: 'Nintendo Switch 2 launches', startDate: '2025-06-05' };

describe('quickStep', () => {
  it('posts a draft the AI filled in with a title and a start', () => {
    expect(quickStep({ title: ready.title }, ready)).toBe('post');
  });

  it('hands a page of dated entries to the author to pick from', () => {
    const entries = { pageTitle: 'Release notes', list: [{ url: 'https://x.test/#a', title: 'A', date: '2026-09-01' }] };
    expect(quickStep({ entries } as never, ready)).toBe('entries');
  });

  it('never posts what was read without the AI, even with a title and date', () => {
    expect(quickStep({ llm: 'session' }, ready)).toBe('unavailable');
  });

  it('asks for what the AI could not find', () => {
    expect(quickStep({}, { title: ' ', startDate: '2025-06-05' })).toBe('incomplete');
    expect(quickStep({}, { title: ready.title, startDate: '' })).toBe('incomplete');
  });
});
