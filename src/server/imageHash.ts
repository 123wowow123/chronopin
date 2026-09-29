// Telling a picture from the same picture again. Two sources hardly ever hand
// over the same bytes - MyAnimeList's poster is 225px wide on its own page and
// 356px wide on its CDN, an article's og:image is its lead photo re-encoded -
// so neither the URL nor a checksum of it can say that a pin is about to be
// given the picture it already has. A difference hash can: it reads the
// picture's shape rather than its pixels, so scaling, re-encoding and a title
// band across the bottom leave it nearly unchanged.

// What the hash needs of a picture, rather than a Jimp type: Jimp's instance
// type for a decoded buffer and for a picture built in code are two unrelated
// types by the compiler's reckoning, and it exports neither by name.
type Pixels = { bitmap: { data: ArrayLike<number> } };
type Picture = { clone(): { greyscale(): { resize(options: { w: number; h: number }): Pixels } } };

// The hash compares SIDE x SIDE neighbouring pairs, a bit each: 64 bits, as
// 16 hex digits.
const SIDE = 8;

// How far apart two hashes may be and still be the same picture. Measured over
// the pictures pins actually collect: one poster at two sizes, or with a title
// band added, comes out at 6 or less, and every pair below 7 that was looked at
// was the same picture. Above that the two cases overlap - a second photo of
// the same launch sits at 8, two different chips at 10 - so 6 is as far as a
// rule can go without throwing away pictures that do say something new.
export const NEAR_DUPLICATE_DISTANCE = 6;

// The picture's difference hash: each pixel of a 9x8 grey thumbnail against
// the one to its right, a bit for brighter.
export function imageHash(picture: Picture): string {
  const small = picture.clone().greyscale().resize({ w: SIDE + 1, h: SIDE });
  let bits = 0n;
  for (let y = 0; y < SIDE; y++) {
    for (let x = 0; x < SIDE; x++) {
      const at = (y * (SIDE + 1) + x) * 4;
      bits = (bits << 1n) | (small.bitmap.data[at] > small.bitmap.data[at + 4] ? 1n : 0n);
    }
  }
  return bits.toString(16).padStart(SIDE * SIDE / 4, '0');
}

// The bits two hashes differ in, 0 (the same picture) to 64.
export function hashDistance(a: string, b: string): number {
  let bits = BigInt(`0x${a}`) ^ BigInt(`0x${b}`);
  let distance = 0;
  while (bits) {
    distance += Number(bits & 1n);
    bits >>= 1n;
  }
  return distance;
}

export function isNearDuplicate(a: string | null | undefined, b: string | null | undefined): boolean {
  return !!a && !!b && hashDistance(a, b) <= NEAR_DUPLICATE_DISTANCE;
}

// The same picture from another URL: the size a CDN writes into the path is
// not a different picture. MyAnimeList's posters differ by an l (large), t
// (thumb) or v suffix, Wikimedia serves /thumb/<file>/<n>px-<file>, and a
// resizing proxy states the size in the query. Dropping all three catches the
// commonest repeat before anything is downloaded; the hash above catches the
// rest afterwards.
export function sameImageKey(url: string): string {
  return url
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\?.*$/, '')
    .replace(/(\/images\/anime\/[^/]+\/\d+)[ltv](\.[a-z]+)$/i, '$1$2')
    .replace(/\/thumb\/(.+)\/\d+px-[^/]+$/i, '/$1')
    .toLowerCase();
}
