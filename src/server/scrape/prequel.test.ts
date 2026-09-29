import { describe, expect, it } from 'vitest';
import { malIdOf, pinMalId } from './prequel';

describe('malIdOf', () => {
  it('reads the id from an anime page link', () => {
    expect(malIdOf('https://myanimelist.net/anime/60601/Tensei_Kizoku_Kantei_Skill_de_Nariagaru_3rd_Season')).toBe(60601);
    expect(malIdOf('myanimelist.net/anime/55265')).toBe(55265);
  });

  it('finds nothing in other links', () => {
    expect(malIdOf('https://myanimelist.net/manga/134946')).toBeUndefined();
    expect(malIdOf('https://anilist.co/anime/164702')).toBeUndefined();
    expect(malIdOf(null)).toBeUndefined();
  });
});

describe('pinMalId', () => {
  it('prefers the source URL, then the MyAnimeList rating', () => {
    const rating = { source: 'MyAnimeList', url: 'https://myanimelist.net/anime/59131/x' };
    expect(pinMalId({ sourceUrl: 'https://myanimelist.net/anime/55265/x', ratings: [rating] })).toBe(55265);
    expect(pinMalId({ sourceUrl: 'https://www.crunchyroll.com/news/x', ratings: [{ source: 'AniList', url: 'https://anilist.co/anime/1' }, rating] })).toBe(59131);
    expect(pinMalId({ sourceUrl: 'https://www.crunchyroll.com/news/x', ratings: [] })).toBeUndefined();
  });
});
