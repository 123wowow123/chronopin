import { describe, expect, it } from 'vitest';
import {
  detectScript,
  extractWorkTitle,
  isAlternateTag,
  sortAlternateNames,
  type AlternateNameJson,
} from './alternateNames';

describe('detectScript', () => {
  it('detects Japanese (Hiragana and Katakana)', () => {
    expect(detectScript('葬送のフリーレン')).toEqual({ script: 'ja', label: '日本語' });
    expect(detectScript('鬼滅の刃')).toEqual({ script: 'ja', label: '日本語' });
    expect(detectScript('光が死んだ夏')).toEqual({ script: 'ja', label: '日本語' });
  });

  it('detects Korean (Hangul)', () => {
    expect(detectScript('장송의 프리렌')).toEqual({ script: 'ko', label: '한국어' });
    expect(detectScript('귀멸의 칼날')).toEqual({ script: 'ko', label: '한국어' });
  });

  it('detects Chinese (Han without Kana/Hangul)', () => {
    expect(detectScript('葬送的芙莉蓮')).toEqual({ script: 'zh', label: '中文' });
    expect(detectScript('鬼灭之刃')).toEqual({ script: 'zh', label: '中文' });
  });

  it('detects Romaji with macrons', () => {
    expect(detectScript('Sōsō no Furīren')).toEqual({ script: 'romaji', label: 'Romaji' });
    expect(detectScript('Kōtetsujō no Kabaneri')).toEqual({ script: 'romaji', label: 'Romaji' });
  });

  it('detects Russian (Cyrillic)', () => {
    expect(detectScript('Фрирен, провожающая в последний путь')).toEqual({ script: 'ru', label: 'Русский' });
    expect(detectScript('Клинок, рассекающий демонов')).toEqual({ script: 'ru', label: 'Русский' });
  });

  it('detects Arabic', () => {
    expect(detectScript('فريرن: ما وراء نهاية الرحلة')).toEqual({ script: 'ar', label: 'العربية' });
  });

  it('detects Thai', () => {
    expect(detectScript('คำอธิษฐานในวันที่จากลา Frieren')).toEqual({ script: 'th', label: 'ไทย' });
  });

  it('detects Latin alias', () => {
    expect(detectScript('Frieren at the Funeral')).toEqual({ script: 'latin', label: 'Alias' });
  });
});

describe('extractWorkTitle', () => {
  it('extracts Japanese brackets 『...』 and 「...」', () => {
    expect(extractWorkTitle('『君たちはどう生きるか』が日本で公開')).toBe('君たちはどう生きるか');
    expect(extractWorkTitle('「鬼滅の刃」放送開始')).toBe('鬼滅の刃');
  });

  it('extracts Chinese guillemets 《...》', () => {
    expect(extractWorkTitle('《你想活出怎样的人生》在日本上映')).toBe('你想活出怎样的人生');
    expect(extractWorkTitle('《鬼灭之刃》开播')).toBe('鬼灭之刃');
  });

  it('extracts French guillemets «...»', () => {
    expect(extractWorkTitle('« Le Garçon et le Héron » sort au Japon')).toBe('Le Garçon et le Héron');
  });

  it('extracts German quotes „...“', () => {
    expect(extractWorkTitle('„Der Junge und der Reiher“ startet in Japan')).toBe('Der Junge und der Reiher');
  });

  it('extracts standard quotes "..." or “...”', () => {
    expect(extractWorkTitle('“The Boy and the Heron” Ditayangkan')).toBe('The Boy and the Heron');
  });

  it('extracts title before dash delimiter', () => {
    expect(extractWorkTitle('MERCY Vegan Ramen — Shijo Kawaramachi Opens')).toBe('MERCY Vegan Ramen');
  });

  it('returns null when no title delimiter is found', () => {
    expect(extractWorkTitle('Plain headline without quotes or delimiters')).toBeNull();
  });
});

describe('isAlternateTag', () => {
  const pinTitle = "Frieren: Beyond Journey's End Premieres";

  it('accepts non-Latin and Romaji tags', () => {
    expect(isAlternateTag('葬送のフリーレン', pinTitle)).toBe(true);
    expect(isAlternateTag('장송의 프리렌', pinTitle)).toBe(true);
    expect(isAlternateTag('Sōsō no Furīren', pinTitle)).toBe(true);
  });

  it('accepts title acronyms and subtitle phrases', () => {
    expect(isAlternateTag('FMAB', 'Fullmetal Alchemist: Brotherhood Premieres')).toBe(true);
    expect(isAlternateTag('Frieren: Beyond Journey’s End', pinTitle)).toBe(true);
    expect(isAlternateTag('Frieren at the Funeral', pinTitle)).toBe(true);
  });

  it('rejects generic genres, categories, and adaptation tags', () => {
    expect(isAlternateTag('Anime', pinTitle)).toBe(false);
    expect(isAlternateTag('Manga', pinTitle)).toBe(false);
    expect(isAlternateTag('Horror', pinTitle)).toBe(false);
    expect(isAlternateTag('Fantasy', pinTitle)).toBe(false);
    expect(isAlternateTag('Manga Adaptation', pinTitle)).toBe(false);
    expect(isAlternateTag('Final Chapter', pinTitle)).toBe(false);
  });

  it('rejects corporate / company names', () => {
    expect(isAlternateTag('Yen Press', 'The Summer Hikaru Died', null, 'Yen Press')).toBe(false);
    expect(isAlternateTag('Toei Animation', 'Dragon Ball Super', null, 'Toei Animation')).toBe(false);
  });
});

describe('sortAlternateNames', () => {
  it('orders Japanese first, then Romaji, Korean, Chinese, and other languages', () => {
    const names: AlternateNameJson[] = [
      { name: 'Frieren at the Funeral', label: 'Alias', script: 'latin', source: 'tag' },
      { name: '장송의 프리렌', label: '한국어', script: 'ko', source: 'tag' },
      { name: '葬送のフリーレン', label: '日本語', script: 'ja', source: 'tag' },
      { name: 'Sōsō no Furīren', label: 'Romaji', script: 'romaji', source: 'tag' },
      { name: '葬送的芙莉蓮', label: '中文', script: 'zh', source: 'tag' },
    ];

    const sorted = sortAlternateNames(names);
    expect(sorted.map((s) => s.name)).toEqual([
      '葬送のフリーレン',
      'Sōsō no Furīren',
      '장송의 프리렌',
      '葬送的芙莉蓮',
      'Frieren at the Funeral',
    ]);
  });
});

