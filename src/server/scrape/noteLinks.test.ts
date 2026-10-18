import { describe, expect, it } from 'vitest';
import { kindByAddress, linksInNote } from './noteLinks';

describe('linksInNote', () => {
  it('takes each link once, in order, without trailing punctuation or the page itself', () => {
    const note = 'The Tokyo opening (see https://news.example.com/a). Also https://news.example.com/a, and https://page.example.com/story. Video: https://youtu.be/dQw4w9WgXcQ!';
    expect(linksInNote(note, 'https://page.example.com/story')).toEqual(['https://news.example.com/a', 'https://youtu.be/dQw4w9WgXcQ']);
  });

  it('has nothing for a note without links', () => {
    expect(linksInNote('The price cut, not the launch', 'https://x.test')).toEqual([]);
    expect(linksInNote(undefined, 'https://x.test')).toEqual([]);
  });
});

describe('kindByAddress', () => {
  it('knows YouTube videos and posts on X by their address', () => {
    expect(kindByAddress('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('youtube');
    expect(kindByAddress('https://youtu.be/dQw4w9WgXcQ')).toBe('youtube');
    expect(kindByAddress('https://x.com/nasa/status/1234567890?s=20')).toBe('tweet');
    expect(kindByAddress('https://mobile.twitter.com/nasa/status/1234567890/photo/1')).toBe('tweet');
  });

  it('reads a channel or a profile as a page, and leaves anything else to the server', () => {
    expect(kindByAddress('https://www.youtube.com/@nasa')).toBe('page');
    expect(kindByAddress('https://x.com/nasa')).toBe('page');
    expect(kindByAddress('https://cdn.example.com/photo')).toBeUndefined();
  });
});
