import { describe, expect, it } from 'vitest';
import { matchAwards, parseCrunchyrollEdition, parseJapanAcademyAnimation, parseTokyoAnimeAward, titleKey, type AwardEntry } from './awards';

// Cut down from the real pages, markup as Wikipedia renders it.
const CRUNCHYROLL = `<table class="wikitable"><tbody><tr>
<td style="vertical-align:top; width:50%;"><div style="background-color:#eedd82"><b><a href="/wiki/X" title="X">Anime of the Year</a></b></div>
<ul><li><b><i><a href="/wiki/Solo_Leveling" title="Solo Leveling">Solo Leveling</a></i> — <a href="/wiki/A-1_Pictures" title="A-1 Pictures">A-1 Pictures</a></b>‡
<ul><li><i><a href="/wiki/Dandadan_(TV_series)" title="Dandadan (TV series)">Dandadan</a></i> — Science SARU</li>
<li><i><a href="/wiki/Frieren_(TV_series)" title="Frieren (TV series)">Frieren: Beyond Journey&#39;s End</a></i> — Madhouse</li></ul></li></ul></td>
<td style="vertical-align:top; width:50%;"><div style="background-color:#eedd82"><b>Best Main Character</b></div>
<ul><li><b>Sung Jinwoo — <i><a href="/wiki/Solo_Leveling" title="Solo Leveling">Solo Leveling</a></i></b>‡
<ul><li>Frieren — <i><a href="/wiki/Frieren_(TV_series)" title="Frieren (TV series)">Frieren: Beyond Journey&#39;s End</a></i></li></ul></li></ul></td>
</tr></tbody></table>`;

const TOKYO = `<h2 id="Animation_of_the_Year">Animation of the Year</h2>
<table class="wikitable"><tbody><tr><th>Year</th><th>Winner</th></tr>
<tr><th>2017 </th><td rowspan="2"><i><a href="/wiki/Yuri_on_Ice" title="Yuri on Ice">Yuri on Ice</a></i></td></tr>
<tr><th>2018 </th></tr>
<tr><th>2019 </th><td><i><a href="/wiki/Banana_Fish" title="Banana Fish">Banana Fish</a></i></td></tr></tbody></table>
<h2 id="See_also">See also</h2><table class="wikitable"><tr><th>2020</th><td><i>Nope</i></td></tr></table>`;

const ACADEMY = `<table class="wikitable"><tbody><tr><th>Year</th><th>Best</th><th>Excellent</th></tr>
<tr><td>2024 </td><td><i><a href="/wiki/The_Boy_and_the_Heron" title="The Boy and the Heron">The Boy and the Heron</a></i></td>
<td><ul><li><i><a href="/wiki/Suzume_(film)" title="Suzume (film)">Suzume</a></i></li><li><i><a href="/wiki/The_First_Slam_Dunk" title="The First Slam Dunk">The First Slam Dunk</a></i></li></ul></td></tr></tbody></table>`;

describe('award pages', () => {
  it('reads a Crunchyroll edition: the ‡ winner and its nominees, by category', () => {
    const entries = parseCrunchyrollEdition(CRUNCHYROLL, 2025, 'u');
    expect(entries.map((e) => [e.award, e.work, e.result])).toEqual([
      ['Anime of the Year', 'Solo Leveling', 'won'],
      ['Anime of the Year', 'Dandadan', 'nominated'],
      ['Anime of the Year', "Frieren: Beyond Journey's End", 'nominated'],
      ['Best Main Character', 'Solo Leveling', 'won'],
      ['Best Main Character', "Frieren: Beyond Journey's End", 'nominated'],
    ]);
    expect(entries[0]).toMatchObject({ body: 'Crunchyroll Anime Awards', year: 2025, workArticle: 'Solo Leveling' });
  });

  it('reads the Tokyo Anime Award, a winner spanning years, and skips See also', () => {
    const entries = parseTokyoAnimeAward(TOKYO, 'u');
    expect(entries.map((e) => [e.award, e.year, e.work])).toEqual([
      ['Animation of the Year', 2017, 'Yuri on Ice'],
      ['Animation of the Year', 2018, 'Yuri on Ice'],
      ['Animation of the Year', 2019, 'Banana Fish'],
    ]);
  });

  it('reads the Japan Academy winner and the other nominees', () => {
    expect(parseJapanAcademyAnimation(ACADEMY, 'u').map((e) => [e.year, e.work, e.result])).toEqual([
      [2024, 'The Boy and the Heron', 'won'],
      [2024, 'Suzume', 'nominated'],
      [2024, 'The First Slam Dunk', 'nominated'],
    ]);
  });
});

describe('matching awards to pins', () => {
  const entry = (work: string, result: AwardEntry['result'] = 'won', award = 'Anime of the Year', year = 2021): AwardEntry => ({
    body: 'Crunchyroll Anime Awards',
    award,
    year,
    work,
    workArticle: null,
    result,
    sourceUrl: 'u',
  });

  it('finds the work a title is about, or a season of it', () => {
    const all = [entry('Jujutsu Kaisen'), entry('Mob Psycho 100 II'), entry('Oshi no Ko', 'nominated'), entry('Solo Leveling'), entry('The First Slam Dunk')];
    expect(matchAwards(all, ['Jujutsu Kaisen Season 2 Premieres']).map((e) => e.work)).toEqual(['Jujutsu Kaisen']);
    expect(matchAwards(all, ['[Oshi No Ko] Season 3 Premieres']).map((e) => e.work)).toEqual(['Oshi no Ko']);
    expect(matchAwards(all, ['Solo Leveling Season 2 -Arise from the Shadow- Premieres']).map((e) => e.work)).toEqual(['Solo Leveling']);
    expect(matchAwards(all, ['The First Slam Dunk Releases in Japanese Theaters']).map((e) => e.work)).toEqual(['The First Slam Dunk']);
    // Not a sequel's award for the first season.
    expect(matchAwards(all, ['Mob Psycho 100 Premieres'])).toEqual([]);
  });

  it('leaves out spin-offs and named arcs that share the name', () => {
    const all = [entry('One Piece'), entry('Jujutsu Kaisen')];
    expect(matchAwards(all, ['One Piece: Episode of Sabo - 3 Kyoudai no Kizuna Premieres'])).toEqual([]);
    expect(matchAwards(all, ['One Piece Film: Red Releases in Japanese Theaters'])).toEqual([]);
    expect(matchAwards(all, ['Jujutsu Kaisen: The Culling Game Part 2 Premieres'])).toEqual([]);
    expect(matchAwards(all, ['One Piece Premieres']).map((e) => e.work)).toEqual(['One Piece']);
    expect(matchAwards([entry('Code Geass: Lelouch of the Rebellion')], ['Code Geass: Lelouch of the Rebellion R2 Premieres'])).toHaveLength(1);
    expect(matchAwards([entry("Miss Kobayashi's Dragon Maid")], ["Miss Kobayashi's Dragon Maid S Premieres"])).toHaveLength(1);
  });

  it('does not match a name inside another word', () => {
    expect(matchAwards([entry('Look Back')], ['Look Backward Premieres'])).toEqual([]);
  });

  it('keeps a win over the same category listed as a nomination, wins first', () => {
    const found = matchAwards([entry('Frieren', 'nominated', 'Best Drama'), entry('Frieren', 'won', 'Best Drama'), entry('Frieren', 'nominated', 'Best Score')], ['Frieren']);
    expect(found.map((e) => [e.award, e.result])).toEqual([
      ['Best Drama', 'won'],
      ['Best Score', 'nominated'],
    ]);
  });

  it('keys titles without punctuation or accents', () => {
    expect(titleKey('Re:ZERO -Starting Life- & Kitarō')).toBe('re zero starting life and kitaro');
  });
});
