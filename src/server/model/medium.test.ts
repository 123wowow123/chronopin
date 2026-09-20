import { describe, expect, it } from 'vitest';
import { mediumID } from '@/lib/appConfig';
import Medium, { withoutRepeatedPictures } from './medium';

// A medium whose picture has already been read, so nothing is downloaded here.
function picture(originalUrl: string, hash: string) {
  const medium = new Medium({ type: String(mediumID.image), originalUrl });
  medium._imageHash = hash;
  return medium;
}

const POSTER = '0f1e3c78f0e1c387';
// The same poster, smaller: two bits apart.
const POSTER_AGAIN = '0f1e3c78f0e1c385';
const OTHER = 'ff00ff00ff00ff00';

describe('withoutRepeatedPictures', () => {
  it('drops a picture the pin already has, whatever its URL says', async () => {
    const adding = picture('https://cdn.myanimelist.net/images/anime/1729/135900.jpg', POSTER_AGAIN);
    const had = picture('https://cdn.myanimelist.net/images/anime/1729/135900l.jpg', POSTER);
    const { keep, dropped } = await withoutRepeatedPictures([adding], [had]);
    expect(keep).toEqual([]);
    expect(dropped).toEqual([{ medium: adding, like: had }]);
  });

  it('keeps a picture that says something new', async () => {
    const adding = picture('https://example.com/factory.jpg', OTHER);
    expect((await withoutRepeatedPictures([adding], [picture('https://example.com/poster.jpg', POSTER)])).keep).toEqual([adding]);
  });

  it('weighs the pictures being added against each other too', async () => {
    const first = picture('https://example.com/a.jpg', POSTER);
    const second = picture('https://example.com/b.jpg', POSTER_AGAIN);
    const third = picture('https://example.com/c.jpg', OTHER);
    expect((await withoutRepeatedPictures([first, second, third], [])).keep).toEqual([first, third]);
  });

  it('leaves videos and unread pictures alone', async () => {
    const video = new Medium({ type: String(mediumID.youtube), originalUrl: 'https://youtu.be/x' });
    // A picture with nothing left to read it from - no thumb, no original.
    const unread = new Medium({ type: String(mediumID.image) });
    // Nothing can be said about either, so both are kept.
    const { keep } = await withoutRepeatedPictures([video, unread], [picture('https://example.com/poster.jpg', POSTER)]);
    expect(keep).toEqual([video, unread]);
  });
});
