import { describe, expect, it } from 'vitest';
import { sourceKind } from './sourceKind';

describe('sourceKind', () => {
  it('names videos, posts and podcasts by host', () => {
    expect(sourceKind('https://www.youtube.com/watch?v=okFSR8CCOPY')).toBe('youtube');
    expect(sourceKind('https://youtu.be/okFSR8CCOPY')).toBe('youtube');
    expect(sourceKind('https://m.youtube.com/watch?v=okFSR8CCOPY')).toBe('youtube');
    expect(sourceKind('https://x.com/nasa/status/123')).toBe('tweet');
    expect(sourceKind('https://twitter.com/nasa/status/123')).toBe('tweet');
    expect(sourceKind('https://podcasts.apple.com/us/podcast/x/id1?i=2')).toBe('podcast');
    expect(sourceKind('https://open.spotify.com/episode/abc')).toBe('podcast');
    expect(sourceKind('https://cdn.example.com/show/ep12.mp3')).toBe('podcast');
  });

  it('treats everything else, and junk, as a web page', () => {
    expect(sourceKind('https://open.spotify.com/track/abc')).toBe('web');
    expect(sourceKind('https://www.theverge.com/2026/9/18/story')).toBe('web');
    expect(sourceKind('not a url')).toBe('web');
  });
});
