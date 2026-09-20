import { describe, expect, it } from 'vitest';
import { firstSentences } from './companyDescription';

describe('firstSentences', () => {
  it('keeps the first two sentences of an intro', () => {
    const intro =
      'Nintendo is a Japanese video game company. It develops and publishes games for its own consoles. ' +
      'It was founded in 1889 as a playing card maker.';
    expect(firstSentences(intro)).toBe('Nintendo is a Japanese video game company. It develops and publishes games for its own consoles.');
  });

  it('reads a full stop inside a company name as part of the sentence', () => {
    const intro = 'Apple Inc. is an American multinational corporation headquartered in Cupertino, California.';
    expect(firstSentences(intro)).toBe(intro);
  });

  it('drops a pronunciation aside', () => {
    expect(firstSentences('Xiaomi (/ˈʃaʊmiː/) is a Chinese manufacturer of consumer electronics.')).toBe(
      'Xiaomi is a Chinese manufacturer of consumer electronics.',
    );
  });

  it('stops before a second sentence that would run past the limit', () => {
    const intro = 'Alpha makes chips. Beta is a much longer second sentence that would not fit in the space there is.';
    expect(firstSentences(intro, 40)).toBe('Alpha makes chips.');
  });

  it('cuts one very long sentence at a whole word', () => {
    const blurb = firstSentences('Gamma is a company that makes an unusually long list of quite different things.', 30);
    expect(blurb).toBe('Gamma is a company that…');
    expect(blurb!.length).toBeLessThanOrEqual(30);
  });

  it('collapses the whitespace an extract comes with, and answers null for an empty one', () => {
    expect(firstSentences('Delta  is\n a studio.')).toBe('Delta is a studio.');
    expect(firstSentences('   ')).toBe(null);
  });
});
