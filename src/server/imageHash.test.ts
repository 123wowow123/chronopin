import { Jimp } from 'jimp';
import { describe, expect, it } from 'vitest';
import { hashDistance, imageHash, isNearDuplicate, NEAR_DUPLICATE_DISTANCE, sameImageKey } from './imageHash';

// A picture with something in it: flat colour would hash to nothing but zeroes
// and make any two pictures look alike. This is a deterministic pattern of
// blocks, the second one a different arrangement of the same colours.
function pattern(seed: number, width = 300, height = 420) {
  const image = new Jimp({ width, height, color: 0xffffffff });
  for (let y = 0; y < height; y += 20) {
    for (let x = 0; x < width; x += 20) {
      const value = ((x * 7 + y * 13) * seed) % 255;
      image.scan(x, y, 20, 20, (_x, _y, at) => {
        image.bitmap.data[at] = value;
        image.bitmap.data[at + 1] = (value * 3) % 255;
        image.bitmap.data[at + 2] = (value * 5) % 255;
      });
    }
  }
  return image;
}

describe('imageHash', () => {
  it('reads the same picture the same after a resize and a re-encode', async () => {
    const poster = pattern(11);
    const hash = imageHash(poster);
    // What a second source hands over: the same poster, smaller and as JPEG.
    const smaller = await Jimp.fromBuffer(await poster.clone().resize({ w: 120 }).getBuffer('image/jpeg', { quality: 70 }));
    expect(hashDistance(hash, imageHash(smaller))).toBeLessThanOrEqual(NEAR_DUPLICATE_DISTANCE);
    expect(isNearDuplicate(hash, imageHash(smaller))).toBe(true);
  });

  it('tells two pictures apart', () => {
    expect(isNearDuplicate(imageHash(pattern(11)), imageHash(pattern(23)))).toBe(false);
  });

  it('is 16 hex digits, and nothing without both hashes', () => {
    expect(imageHash(pattern(11))).toMatch(/^[0-9a-f]{16}$/);
    expect(isNearDuplicate(imageHash(pattern(11)), undefined)).toBe(false);
    expect(isNearDuplicate(null, null)).toBe(false);
  });
});

describe('sameImageKey', () => {
  it('reads a CDN size as the same picture', () => {
    expect(sameImageKey('https://cdn.myanimelist.net/images/anime/1729/135900l.jpg')).toBe(
      sameImageKey('http://cdn.myanimelist.net/images/anime/1729/135900.jpg'),
    );
    expect(sameImageKey('https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Poster.jpg/640px-Poster.jpg')).toBe(
      sameImageKey('https://upload.wikimedia.org/wikipedia/commons/a/ab/Poster.jpg'),
    );
    expect(sameImageKey('https://electrek.co/uploads/17c336.jpg?quality=82&resize=1200,628')).toBe(
      sameImageKey('https://electrek.co/uploads/17c336.jpg'),
    );
  });

  it('leaves two different pictures apart', () => {
    expect(sameImageKey('https://cdn.myanimelist.net/images/anime/1729/135900.jpg')).not.toBe(
      sameImageKey('https://cdn.myanimelist.net/images/anime/1729/135901.jpg'),
    );
    // The l is only a size where MyAnimeList writes one.
    expect(sameImageKey('https://example.com/reveal.jpg')).not.toBe(sameImageKey('https://example.com/revea.jpg'));
  });
});
