import { describe, expect, it } from 'vitest';
import { embedUrl, videoSource, youtubeEmbedHtml, youtubeVideoId } from './videoEmbed';

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

describe('videoSource', () => {
  it('names the provider and id of YouTube, Vimeo and Dailymotion links', () => {
    expect(videoSource('https://www.youtube.com/embed/rzi-S1aQ7ds')).toEqual({ provider: 'youtube', id: 'rzi-S1aQ7ds' });
    expect(videoSource('https://vimeo.com/22439234')).toEqual({ provider: 'vimeo', id: '22439234' });
    expect(videoSource('https://player.vimeo.com/video/22439234?h=abc')).toEqual({ provider: 'vimeo', id: '22439234' });
    expect(videoSource('https://www.dailymotion.com/video/x8q8o78')).toEqual({ provider: 'dailymotion', id: 'x8q8o78' });
    expect(videoSource('https://www.dailymotion.com/embed/video/x8q8o78?autoplay=1')).toEqual({ provider: 'dailymotion', id: 'x8q8o78' });
    expect(videoSource('https://dai.ly/x8q8o78')).toEqual({ provider: 'dailymotion', id: 'x8q8o78' });
  });
  it('reads a Twitch clip by its slug from its three URL forms', () => {
    expect(videoSource('https://clips.twitch.tv/FunnyAmazingSlug-AbC123')).toEqual({ provider: 'twitch', id: 'FunnyAmazingSlug-AbC123' });
    expect(videoSource('https://clips.twitch.tv/embed?clip=FunnyAmazingSlug-AbC123&parent=localhost')).toEqual({ provider: 'twitch', id: 'FunnyAmazingSlug-AbC123' });
    expect(videoSource('https://www.twitch.tv/somestreamer/clip/FunnyAmazingSlug-AbC123?filter=clips')).toEqual({ provider: 'twitch', id: 'FunnyAmazingSlug-AbC123' });
    expect(embedUrl('twitch', 'Slug-1')).toBe('https://clips.twitch.tv/embed?clip=Slug-1');
  });
  it('knows nothing of other hosts', () => {
    expect(videoSource('https://vimeo.com/channels/staffpicks')).toBeUndefined();
    expect(videoSource('https://example.com/video/x8q8o78')).toBeUndefined();
    expect(videoSource(undefined)).toBeUndefined();
  });
  it('builds each player address from the id', () => {
    expect(embedUrl('vimeo', '22439234')).toBe('https://player.vimeo.com/video/22439234');
    expect(embedUrl('dailymotion', 'x8q8o78')).toBe('https://www.dailymotion.com/embed/video/x8q8o78');
  });
});
