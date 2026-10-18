import { describe, expect, it } from 'vitest';
import { parseTimedText, pickTrack, videoIdOf } from './transcript';

describe('videoIdOf', () => {
  it('reads watch, short and embed URLs and bare ids', () => {
    expect(videoIdOf('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42')).toBe('dQw4w9WgXcQ');
    expect(videoIdOf('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(videoIdOf('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(videoIdOf(' dQw4w9WgXcQ ')).toBe('dQw4w9WgXcQ');
  });

  it('rejects other services', () => {
    expect(videoIdOf('https://vimeo.com/76979871')).toBeUndefined();
    expect(videoIdOf('https://example.com/')).toBeUndefined();
  });
});

describe('pickTrack', () => {
  const tracks = [
    { languageCode: 'de-DE' },
    { languageCode: 'en', kind: 'asr' },
    { languageCode: 'en-GB' },
    { languageCode: 'fr', kind: 'asr' },
  ];

  it('prefers a written English track over speech recognition', () => {
    expect(pickTrack(tracks)).toBe(tracks[1]);
    expect(pickTrack([tracks[1], { languageCode: 'en' }])).toEqual({ languageCode: 'en' });
  });

  it('matches the requested language, exactly then by base language', () => {
    expect(pickTrack(tracks, 'fr')).toBe(tracks[3]);
    expect(pickTrack(tracks, 'de')).toBe(tracks[0]);
    expect(pickTrack(tracks, 'EN-gb')).toBe(tracks[2]);
    expect(pickTrack(tracks, 'ja')).toBeUndefined();
  });

  it('falls back to the first track when there is no English', () => {
    expect(pickTrack([tracks[0], tracks[3]])).toBe(tracks[0]);
    expect(pickTrack([])).toBeUndefined();
  });
});

describe('parseTimedText', () => {
  it('reads timings, joins word spans, decodes entities and skips empty lines', () => {
    const xml = `<?xml version="1.0" encoding="utf-8" ?><timedtext format="3"><body>
<p t="1360" d="1680">We&#39;re no
strangers &amp; friends</p>
<p t="3000" d="2500" w="1"><s ac="0">the</s><s t="400" ac="0"> tunnel</s></p>
<p t="5500" d="10" a="1">
</p>
</body></timedtext>`;
    expect(parseTimedText(xml)).toEqual([
      { start: 1.36, duration: 1.68, text: "We're no strangers & friends" },
      { start: 3, duration: 2.5, text: 'the tunnel' },
    ]);
  });
});
