import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  aniListEpisodes,
  findScreenDetails,
  malIdOf,
  isScreenCategory,
  malEpisodes,
  normalizeTitle,
  parseScore,
  pickTrailer,
  titleCandidates,
  wikidataEpisodes,
  wikidataRatings,
  yearFits,
  youtubeStill,
} from './screen';

describe('normalizeTitle', () => {
  it('ignores case, punctuation, a leading "the" and ordinal seasons', () => {
    expect(normalizeTitle("Frieren: Beyond Journey’s End")).toBe(normalizeTitle("frieren - beyond journey's end"));
    expect(normalizeTitle('Sousou no Frieren 2nd Season')).toBe('sousou no frieren season 2');
    expect(normalizeTitle('The Apothecary Diaries')).toBe('apothecary diaries');
    expect(normalizeTitle('Pokémon & Friends')).toBe('pokemon and friends');
  });
});

describe('titleCandidates', () => {
  it('prefers the given work title, then reads titles out of the pin title', () => {
    expect(titleCandidates({ workTitle: 'Jujutsu Kaisen Season 2', pinTitle: 'Jujutsu Kaisen Season 2 Premieres' })).toEqual(['Jujutsu Kaisen Season 2']);
    expect(titleCandidates({ pinTitle: 'Project Hail Mary Opens in Theaters' })).toEqual(['Project Hail Mary']);
  });

  it('takes a quoted title first and drops possessive credits and "Reboot"', () => {
    expect(titleCandidates({ pinTitle: "Michael Jackson Biopic 'Michael' Opens in Theaters" })[0]).toBe('Michael');
    expect(titleCandidates({ pinTitle: "Christopher Nolan's The Odyssey Opens in Theaters" })).toContain('The Odyssey');
    expect(titleCandidates({ pinTitle: "Disney's Live-Action Moana Opens in Theaters" })).toContain('Moana');
    expect(titleCandidates({ pinTitle: 'Street Fighter Reboot Set for October Release' })).toContain('Street Fighter');
  });

  it('does not cut an event word out of the name when that would drop the season', () => {
    const titles = titleCandidates({ pinTitle: "The World's Finest Assassin Gets Reincarnated in Another World as an Aristocrat Season 2 Premieres" });
    expect(titles[0]).toBe("The World's Finest Assassin Gets Reincarnated in Another World as an Aristocrat Season 2");
    expect(titles).not.toContain("The World's Finest Assassin");
    expect(titleCandidates({ pinTitle: '‘Demon Slayer’ Season 3 Gets An Exact Release Date And New English Trailer' })[0]).toBe('Demon Slayer Season 3');
  });

  it('uses a pin titled by the work alone', () => {
    expect(titleCandidates({ pinTitle: 'Evangelion: 3.0 + 1.0' })).toEqual(['Evangelion: 3.0 + 1.0']);
  });

  it('keeps a possessive that is part of the title as its first guess', () => {
    expect(titleCandidates({ pinTitle: "Howl's Moving Castle Releases in Japanese Theaters" })[0]).toBe("Howl's Moving Castle");
  });
});

describe('pickTrailer', () => {
  const video = (title: string, verified = true, videoId = title) => ({ videoId, title, verified });

  it('picks an official trailer from a verified channel over others', () => {
    const picked = pickTrailer(
      [video("Frieren: Beyond Journey's End Season 1 Trailer", false, 'a'), video("Frieren: Beyond Journey's End | Official Trailer", true, 'b')],
      "Frieren: Beyond Journey's End",
    );
    expect(picked?.videoId).toBe('b');
  });

  it('skips channels YouTube has not verified', () => {
    expect(pickTrailer([video('Moana | Official Trailer', false)], 'Moana')).toBeUndefined();
  });

  it('skips reactions, sequels, games and other seasons', () => {
    expect(pickTrailer([video('Scream 6 Official Trailer'), video('Scream 7 Trailer Reaction')], 'Scream')).toBeUndefined();
    expect(pickTrailer([video('Street Fighter 6 Official Trailer')], 'Street Fighter')).toBeUndefined();
    expect(pickTrailer([video('Jujutsu Kaisen Season 3 Official Trailer')], 'Jujutsu Kaisen Season 2')).toBeUndefined();
    expect(pickTrailer([video('Jujutsu Kaisen 2nd Season PV')], 'Jujutsu Kaisen Season 2')).toBeDefined();
    expect(pickTrailer([video('Blue Box Season 2 Trailer')], 'Blue Box')).toBeUndefined();
  });

  it('tells a work from its film and from a title with "The" added', () => {
    expect(pickTrailer([video('Violet Evergarden: the Movie | Official Trailer')], 'Violet Evergarden')).toBeUndefined();
    expect(pickTrailer([video('Violet Evergarden I: Eternity and the Auto Memory Doll | Official Trailer')], 'Violet Evergarden')).toBeUndefined();
    expect(pickTrailer([video('ONE PIECE | Official Trailer | Netflix')], 'The One Piece')).toBeUndefined();
    expect(pickTrailer([video('THE ONE PIECE | Official Teaser')], 'The One Piece')).toBeDefined();
    expect(pickTrailer([video('Masters of The Universe – Official Trailer')], 'Masters of the Universe')).toBeDefined();
  });

  it('does not hold words in the work title against its trailer', () => {
    expect(pickTrailer([video('Coyote vs. Acme | Official Trailer')], 'Coyote vs. Acme')).toBeDefined();
  });
});

describe('ratings', () => {
  it('parses Wikidata score strings', () => {
    expect(parseScore('93%')).toEqual({ score: 93, scoreMax: 100 });
    expect(parseScore('8.2/10')).toEqual({ score: 8.2, scoreMax: 10 });
    expect(parseScore('90 / 100')).toEqual({ score: 90, scoreMax: 100 });
    expect(parseScore('12/10')).toBeUndefined();
    expect(parseScore('A+')).toBeUndefined();
  });

  it('keeps the critics score, preferred then newest, with a link to the site', () => {
    const rt = 'http://www.wikidata.org/entity/Q105584';
    const imdb = 'http://www.wikidata.org/entity/Q37312';
    const rows = [
      { by: rt, score: '80%', methodLabel: 'Tomatometer score', date: '2024-01-01', rt: 'm/oppenheimer_2023' },
      { by: rt, score: '93%', methodLabel: 'Tomatometer score', date: '2026-01-11', rt: 'm/oppenheimer_2023' },
      { by: rt, score: '91%', methodLabel: 'Popcornmeter', date: '2026-02-01', rt: 'm/oppenheimer_2023' },
      { by: imdb, score: '8.2/10', methodLabel: 'weighted average', imdb: 'tt15398776' },
    ];
    expect(wikidataRatings(rows)).toEqual([
      { source: 'IMDb', score: 8.2, scoreMax: 10, url: 'https://www.imdb.com/title/tt15398776/' },
      { source: 'Rotten Tomatoes', score: 93, scoreMax: 100, url: 'https://www.rottentomatoes.com/m/oppenheimer_2023' },
    ]);
  });

  it('only matches a work from around the pin year, or a series started before it', () => {
    expect(yearFits(2023, 2024)).toBe(true);
    expect(yearFits(2009, 2026)).toBe(false);
    expect(yearFits(2009, 2026, true)).toBe(true);
    expect(yearFits(2027, 2024, true)).toBe(false);
    expect(yearFits(undefined, 2024)).toBe(true);
  });
});

describe('helpers', () => {
  it('knows the screen categories in any case', () => {
    expect(isScreenCategory('movies')).toBe(true);
    expect(isScreenCategory('Gaming & Entertainment')).toBe(false);
    expect(isScreenCategory(undefined)).toBe(false);
  });

  it('makes a still image from an embed url', () => {
    expect(youtubeStill('https://www.youtube.com/embed/Iwr1aLEDpe4')).toEqual({ type: 1, originalUrl: 'https://i.ytimg.com/vi/Iwr1aLEDpe4/hqdefault.jpg' });
  });
});

describe('episode counts', () => {
  it('reads AniList: a finished run, a planned total, and what is out so far', () => {
    expect(aniListEpisodes({ format: 'TV', status: 'FINISHED', episodes: 24 })).toEqual({ episodeCount: 24, episodeStatus: 'complete' });
    expect(aniListEpisodes({ format: 'TV', status: 'NOT_YET_RELEASED', episodes: 12 })).toEqual({ episodeCount: 12, episodeStatus: 'planned' });
    expect(aniListEpisodes({ format: 'TV', status: 'RELEASING', episodes: 12 })).toEqual({ episodeCount: 12, episodeStatus: 'planned' });
    expect(aniListEpisodes({ format: 'TV', status: 'RELEASING', episodes: null, nextAiringEpisode: { episode: 1123 } })).toEqual({
      episodeCount: 1122,
      episodeStatus: 'ongoing',
    });
  });

  it('leaves out a film and a work with nothing worth counting', () => {
    expect(aniListEpisodes({ format: 'MOVIE', status: 'FINISHED', episodes: 1 })).toBeUndefined();
    expect(aniListEpisodes({ format: 'TV', status: 'FINISHED', episodes: 1 })).toBeUndefined();
    expect(aniListEpisodes({ format: 'TV', status: 'RELEASING', episodes: null, nextAiringEpisode: { episode: 1 } })).toBeUndefined();
    expect(aniListEpisodes({ format: 'TV', status: 'RELEASING', episodes: null })).toBeUndefined();
    expect(malEpisodes({ type: 'Movie', status: 'Finished Airing', episodes: 1 })).toBeUndefined();
  });

  it('reads MyAnimeList the same way', () => {
    expect(malEpisodes({ type: 'TV', status: 'Finished Airing', episodes: 26 })).toEqual({ episodeCount: 26, episodeStatus: 'complete' });
    expect(malEpisodes({ type: 'TV', status: 'Currently Airing', episodes: 12 })).toEqual({ episodeCount: 12, episodeStatus: 'planned' });
  });

  it('reads a MyAnimeList id out of a pin\'s links, the first one wins', () => {
    expect(malIdOf([null, 'https://example.com/x', 'https://myanimelist.net/anime/55265/Tensei_Kizoku'])).toBe(55265);
    expect(malIdOf(['https://myanimelist.net/anime/21/One_Piece', 'https://myanimelist.net/anime/1535/Death_Note'])).toBe(21);
    expect(malIdOf(['https://myanimelist.net/manga/2/Berserk', undefined])).toBeUndefined();
  });

  it("takes Wikidata's largest count, complete only when the series has ended", () => {
    expect(wikidataEpisodes([{ episodes: '13' }, { episodes: '86' }, { ended: '2013-09-29T00:00:00Z' }])).toEqual({ episodeCount: 86, episodeStatus: 'complete' });
    expect(wikidataEpisodes([{ episodes: '1122' }])).toEqual({ episodeCount: 1122, episodeStatus: 'ongoing' });
    expect(wikidataEpisodes([{ score: '93%' }])).toBeUndefined();
    expect(wikidataEpisodes([{ episodes: '1' }])).toBeUndefined();
  });
});

describe('findScreenDetails with a cited MyAnimeList id', () => {
  // Routes each lookup the fake way: AniList knows nothing (a doujin work it
  // does not list), Wikidata finds nothing, Jikan has the score.
  function stubFetch(jikan: unknown) {
    const calls: string[] = [];
    vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
      calls.push(url);
      const body = url.includes('api.jikan.moe')
        ? JSON.stringify(jikan)
        : url.includes('graphql.anilist.co')
          ? JSON.stringify({ data: { Media: null, Page: { media: [] } } })
          : JSON.stringify({ search: [], results: { bindings: [] } });
      void init;
      return new Response(body, { status: 200, headers: { 'content-type': 'application/json' } });
    });
    return calls;
  }

  afterEach(() => vi.unstubAllGlobals());

  it('takes the MyAnimeList score when AniList has no entry to match', async () => {
    const calls = stubFetch({ data: { url: 'https://myanimelist.net/anime/55315/Gensou_Mangekyou', score: 7.64, type: 'OVA', status: 'Currently Airing', episodes: null } });
    const details = await findScreenDetails({ pinTitle: 'Gensou Mangekyou: The Memories of Phantasm Premieres', category: 'Anime', year: 2011, malId: 55315, skipTrailer: true });
    expect(details.ratings).toEqual([{ source: 'MyAnimeList', score: 7.64, scoreMax: 10, url: 'https://myanimelist.net/anime/55315/Gensou_Mangekyou' }]);
    expect(calls.some((url) => url.includes('api.jikan.moe/v4/anime/55315'))).toBe(true);
  });

  it('leaves the ratings empty when neither source knows the work', async () => {
    stubFetch({ status: 504, message: 'Jikan failed to connect to MyAnimeList' });
    const details = await findScreenDetails({ pinTitle: 'Gensou Mangekyou: The Memories of Phantasm Premieres', category: 'Anime', year: 2011, malId: 55315, skipTrailer: true });
    expect(details.ratings).toEqual([]);
  });
});
