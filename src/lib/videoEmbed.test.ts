import { describe, expect, it } from 'vitest';
import { youtubeEmbedHtml, youtubeVideoId } from './videoEmbed';

describe('youtubeVideoId', () => {
  it('reads watch, short, embed and protocol-relative URLs, and nothing else', () => {
    expect(youtubeVideoId('https://www.youtube.com/watch?v=rzi-S1aQ7ds')).toBe('rzi-S1aQ7ds');
    expect(youtubeVideoId('https://youtu.be/rzi-S1aQ7ds?t=30')).toBe('rzi-S1aQ7ds');
    expect(youtubeVideoId('//www.youtube.com/embed/rzi-S1aQ7ds')).toBe('rzi-S1aQ7ds');
    expect(youtubeVideoId('https://vimeo.com/76979871')).toBeUndefined();
    expect(youtubeVideoId(null)).toBeUndefined();
  });
});

describe('youtubeEmbedHtml', () => {
  it("builds a player for a YouTube URL and none for another site's video", () => {
    expect(youtubeEmbedHtml('https://www.youtube.com/watch?v=rzi-S1aQ7ds')).toContain('src="https://www.youtube.com/embed/rzi-S1aQ7ds"');
    expect(youtubeEmbedHtml('https://vimeo.com/76979871')).toBeUndefined();
  });
});
