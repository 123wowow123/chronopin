import { describe, expect, it } from 'vitest';
import { gameAliases } from './gameMarkets';

describe('gameAliases', () => {
  it('spells a trailing numeral and the franchise abbreviation', () => {
    expect(gameAliases(['Grand Theft Auto VI'])).toEqual(['grand theft auto vi', 'grand theft auto 6', 'gta vi', 'gta 6']);
  });
  it('leaves other names as written', () => {
    expect(gameAliases(['Hollow Knight: Silksong'])).toEqual(['hollow knight silksong']);
  });
  it('does not turn a word into a numeral', () => {
    expect(gameAliases(['Mario Kart World'])).toEqual(['mario kart world']);
  });
});
