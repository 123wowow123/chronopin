import { describe, expect, it } from 'vitest';
import { mediumEmbedHtml, youtubeEmbedHtml, youtubeVideoId } from './videoEmbed';

describe('youtubeVideoId', () => {
  it('reads watch, short, embed and protocol-relative URLs, and nothing else', () => {
    expect(youtubeVideoId('https://www.youtube.com/watch?v=rzi-S1aQ7ds')).toBe('rzi-S1aQ7ds');
    expect(youtubeVideoId('https://youtu.be/rzi-S1aQ7ds?t=30')).toBe('rzi-S1aQ7ds');
    expect(youtubeVideoId('//www.youtube.com/embed/rzi-S1aQ7ds')).toBe('rzi-S1aQ7ds');
    expect(youtubeVideoId('https://vimeo.com/76979871')).toBeUndefined();
    expect(youtubeVideoId(null)).toBeUndefined();
  });
});

describe('mediumEmbedHtml', () => {
  it('keeps a stored player', () => {
    expect(mediumEmbedHtml({ type: 3, html: '<iframe src="//www.youtube.com/embed/abc"></iframe>', originalUrl: 'x' })).toBe(
      '<iframe src="//www.youtube.com/embed/abc"></iframe>',
    );
  });

  it("builds one for a YouTube video added by its watch URL, and none for a picture or another site's video", () => {
    expect(mediumEmbedHtml({ type: '3', html: null, originalUrl: 'https://www.youtube.com/watch?v=rzi-S1aQ7ds' })).toBe(
      youtubeEmbedHtml('https://www.youtube.com/watch?v=rzi-S1aQ7ds'),
    );
    expect(youtubeEmbedHtml('https://www.youtube.com/watch?v=rzi-S1aQ7ds')).toContain('src="https://www.youtube.com/embed/rzi-S1aQ7ds"');
    expect(mediumEmbedHtml({ type: '1', originalUrl: 'https://www.youtube.com/watch?v=rzi-S1aQ7ds' })).toBeUndefined();
    expect(mediumEmbedHtml({ type: '3', originalUrl: 'https://vimeo.com/76979871' })).toBeUndefined();
  });
});
