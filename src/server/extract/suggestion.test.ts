import { describe, expect, it } from 'vitest';
import { urlKey } from '@/lib/citations';
import { cleanReview } from './suggestion';

const seen = (...urls: string[]) => new Set(urls.map((url) => urlKey(url)!));
const ref = (url: string, confidence: number) => ({ url, title: 'Page', confidence, reasoning: 'Says so.' });

describe('cleanReview', () => {
  it('keeps only references seen in a result, confident enough, and not the source', () => {
    const review = cleanReview(
      {
        verdict: 'supported',
        verdictReasoning: '  Nintendo moved it.  ',
        references: [
          ref('https://nintendo.com/news/delay', 92),
          ref('https://made-up.example/typed-from-memory', 95),
          ref('https://blog.example/rumour', 55),
          ref('https://source.example/story', 90),
        ],
      },
      seen('https://nintendo.com/news/delay', 'https://blog.example/rumour', 'https://source.example/story'),
      'https://source.example/story',
    );
    expect(review.verdict).toBe('supported');
    expect(review.reasoning).toBe('Nintendo moved it.');
    expect(review.references.map((r) => r.url)).toEqual(['https://nintendo.com/news/delay']);
  });

  it('reads an unknown verdict as unclear', () => {
    expect(cleanReview({ verdict: 'apply everything', verdictReasoning: 'x' }, seen(), '').verdict).toBe('unclear');
  });

  it('keeps one flag per medium it was shown, with a known problem', () => {
    const review = cleanReview(
      {
        verdict: 'supported',
        verdictReasoning: 'The second picture is another building.',
        media: [
          { medium: '[m2]', problem: 'wrong', reasoning: 'Shows the old stadium.' },
          { medium: 'M2', problem: 'poor', reasoning: 'Again.' },
          { medium: 'M9', problem: 'wrong', reasoning: 'Not shown.' },
          { medium: 'M1', problem: 'ugly', reasoning: 'Unknown problem.' },
        ],
      },
      seen(),
      '',
      ['M1', 'M2'],
    );
    expect(review.media).toEqual([{ medium: 'M2', problem: 'wrong', reasoning: 'Shows the old stadium.' }]);
  });
});
