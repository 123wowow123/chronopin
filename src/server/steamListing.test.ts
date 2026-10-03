import { describe, expect, it } from 'vitest';
import { isTheGame, steamAppId, steamUrl } from './steamListing';

describe('steamAppId', () => {
  it('reads the app out of a store link, and nothing else', () => {
    expect(steamAppId('https://store.steampowered.com/app/3669200/Guildrun/')).toBe(3669200);
    expect(steamAppId('https://store.steampowered.com/app/3669200?utm_source=x')).toBe(3669200);
    expect(steamAppId('https://store.steampowered.com/bundle/123/')).toBeUndefined();
    expect(steamAppId('https://example.com/app/3669200/')).toBeUndefined();
    expect(steamAppId('not a url')).toBeUndefined();
    expect(steamUrl(3669200)).toBe('https://store.steampowered.com/app/3669200/');
  });
});

describe('isTheGame', () => {
  const game = { name: 'Guildrun', type: 'game', releaseYear: 2026 };
  it('takes the exact name, a game, released around the pin year', () => {
    expect(isTheGame(game, ['Guildrun'], 2026)).toBe(true);
    expect(isTheGame(game, ['guildrun!'], 2027)).toBe(true);
    expect(isTheGame({ ...game, releaseYear: undefined }, ['Guildrun'], 2026)).toBe(true);
  });
  it('rejects demos, soundtracks, other games and other years', () => {
    expect(isTheGame({ ...game, name: 'Guildrun Demo' }, ['Guildrun'], 2026)).toBe(false);
    expect(isTheGame({ ...game, type: 'dlc' }, ['Guildrun'], 2026)).toBe(false);
    expect(isTheGame({ name: 'Hades', type: 'game', releaseYear: 2020 }, ['Hades'], 2024)).toBe(false);
    expect(isTheGame(game, ['Guild'], 2026)).toBe(false);
  });
});
