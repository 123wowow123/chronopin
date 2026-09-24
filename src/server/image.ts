// Image downloads, resizing and storage for pin media and profile pictures.

import { Jimp } from 'jimp';
import sharp from 'sharp';
import * as azureBlob from './azureBlob';
import config from './config';
import { imageHash } from './imageHash';
import log from './util/log';

const THUMB_OPTIONS = {
  width: config.thumbWidth,
  uploadImageWidth: config.uploadImageWidth,
};

// Wikimedia's CDN (thumb.wikimedia.org, and others) 403s any request with no
// User-Agent. A browser-like UA is enough to pass.
// Accept names only what Jimp decodes: Squarespace's CDN answers fetch's
// default `*/*` with WebP, which the thumbnailer rejects, but serves the
// same picture as JPEG when asked for it.
const DOWNLOAD_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; Chronopin/1.0)',
  Accept: 'image/jpeg,image/png,image/gif;q=0.9,*/*;q=0.5',
};

// Wikimedia's policy asks a client to name itself and how to reach it, and
// rate-limits (429) one that does not far harder.
const WIKIMEDIA_HEADERS = {
  'User-Agent': 'ChronoPin/1.0 (https://chronopin.com; tech@chronopin.com) image fetch',
};
const isWikimedia = (url: string) => /^https?:\/\/[\w.-]*wikimedia\.org\//i.test(url);
// The longest a 429's Retry-After is waited out once before giving up.
const MAX_RETRY_AFTER_S = 90;
// One try's limit, headers and body together: a host that stalls would
// otherwise hold a pin save open for as long as it likes.
const DOWNLOAD_TIMEOUT_MS = 30_000;
// A network error (undici's "fetch failed": a reset or a DNS blip on a busy
// server), a timeout or a 5xx is tried again after these pauses. Creating a
// pin is not one transaction, so a picture that failed once used to leave the
// pin saved without its media or tags (4 of 28 production posts, 2026-09-23).
const RETRY_PAUSES_MS = [1000, 4000];

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function downloadImage(imgUrl: string): Promise<Buffer> {
  const headers = isWikimedia(imgUrl) ? WIKIMEDIA_HEADERS : DOWNLOAD_HEADERS;
  let waitedOutRateLimit = false;
  for (let retry = 0; ; retry++) {
    const canRetry = retry < RETRY_PAUSES_MS.length;
    let res: Response;
    try {
      res = await fetch(imgUrl, { headers, signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS) });
      if (res.ok) return Buffer.from(await res.arrayBuffer());
    } catch (err) {
      // The cause's own words stay in the message: callers such as
      // media:top-up decide on retrying by them.
      const message = (err as Error).message || String(err);
      if (!canRetry) throw new Error(`Image download failed (${message}): ${imgUrl}`, { cause: err });
      log.warn(`image download retry ${retry + 1} (${message}): ${imgUrl}`);
      await pause(RETRY_PAUSES_MS[retry]);
      continue;
    }
    await res.body?.cancel().catch(() => undefined);
    const wait = Number(res.headers.get('retry-after'));
    if (res.status === 429 && !waitedOutRateLimit && wait > 0 && wait <= MAX_RETRY_AFTER_S) {
      waitedOutRateLimit = true;
      retry--;
      await pause(wait * 1000);
      continue;
    }
    if (canRetry && (res.status >= 500 || res.status === 408)) {
      log.warn(`image download retry ${retry + 1} (${res.status}): ${imgUrl}`);
      await pause(RETRY_PAUSES_MS[retry]);
      continue;
    }
    throw new Error(`Image download failed with ${res.status}: ${imgUrl}`);
  }
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
// An empty IEND chunk: its length (0) and type; its CRC follows.
const PNG_END = Buffer.from([0, 0, 0, 0, 0x49, 0x45, 0x4e, 0x44]);

// A PNG cut off after its IEND chunk. Some (Android screenshots on Wikimedia
// Commons) carry bytes after it, which Jimp's decoder rejects ("unrecognised
// content at end of stream") though they are no part of the picture.
export function trimPng(input: Buffer): Buffer {
  if (!input.subarray(0, 8).equals(PNG_SIGNATURE)) return input;
  const at = input.indexOf(PNG_END, 8);
  return at > 0 && at + 12 < input.length ? input.subarray(0, at + 12) : input;
}

// jpeg-js stops decoding at 512MB of intermediate buffers and 100 megapixels.
// A large Commons original (an 8256x5504 photo is 45MP) blows that ceiling and
// throws "maxMemoryUsageInMB limit exceeded" before shrinkImage ever gets to
// scale it down - the picture is rejected for being too big to shrink. Jimp
// hands these options to the decoder for the matching mime type, so raising
// them lets the big ones through to the resize that makes them small.
const DECODE_OPTIONS = {
  'image/jpeg': { maxMemoryUsageInMB: 2048, maxResolutionInMP: 300 },
};

// WebP and AVIF, which Jimp cannot decode ("Mime type image/webp does not
// support decoding") and news sites now serve by default (blog.google's
// pictures, most CDNs): sharp turns them into a JPEG, or a PNG when the
// picture has transparency, and everything after reads that as usual.
const RIFF = Buffer.from('RIFF');
const WEBP = Buffer.from('WEBP');
const FTYP = Buffer.from('ftyp');

export function needsConversion(input: Buffer): boolean {
  if (input.length < 12) return false;
  if (input.subarray(0, 4).equals(RIFF) && input.subarray(8, 12).equals(WEBP)) return true;
  // ISO media (AVIF, HEIC): 'ftyp' at offset 4, then the brand.
  return input.subarray(4, 8).equals(FTYP) && /^(avi[fs]|hei[cxms]|mif1|msf1)$/.test(input.subarray(8, 12).toString('latin1'));
}

async function decodableByJimp(input: Buffer): Promise<Buffer> {
  if (!needsConversion(input)) return input;
  const picture = sharp(input, { failOn: 'none' }).rotate();
  const { hasAlpha } = await picture.metadata();
  return hasAlpha ? picture.png().toBuffer() : picture.jpeg({ quality: 90 }).toBuffer();
}

// fromBuffer, not read: Jimp.read drops its options on the Buffer branch
// (it forwards them only when it fetched a URL itself), so the ceilings above
// would be silently ignored.
//
// The ceiling is raised, not removed, and it cannot be: jpeg-js decodes the
// whole picture before anything can scale it down, so the memory it wants
// grows with the original's pixels however small the thumbnail will be. 2GB
// covers roughly 45 megapixels, which is a generous camera original; a 174MP
// Commons scan still will not fit, and lifting the ceiling past what the
// process has only trades a clean failure for an out-of-memory kill. So an
// image that large fails as itself, with a message that says what to do -
// ask the host for a smaller rendition (Wikimedia's API takes iiurlwidth).
async function readImage(input: Buffer) {
  try {
    return await Jimp.fromBuffer(trimPng(await decodableByJimp(input)), DECODE_OPTIONS);
  } catch (err) {
    const message = (err as Error).message ?? '';
    if (/maxMemoryUsageInMB|maxResolutionInMP/.test(message)) {
      throw new Error(
        `Picture is too large to decode (${message}). Use a smaller rendition of it - on Wikimedia, ask the API for iiurlwidth=1920 and take the thumbnail URL it returns.`,
      );
    }
    throw err;
  }
}

// Scales an image down to uploadImageWidth when it is wider, keeping its type.
export async function shrinkImage(input: Buffer, options: typeof THUMB_OPTIONS) {
  const image = await readImage(input);
  const originalWidth = image.bitmap.width;
  const originalHeight = image.bitmap.height;
  const mime = image.mime ?? 'image/png';

  if (originalWidth > options.uploadImageWidth) {
    image.resize({ w: options.uploadImageWidth });
  }

  const buffer = await image.getBuffer(mime as 'image/png');
  return {
    buffer,
    width: image.bitmap.width,
    height: image.bitmap.height,
    originalWidth,
    originalHeight,
    type: mime,
    // Taken here, off the picture as it is stored, so the fingerprint of a
    // medium saved now and of one re-read from the CDN later are the same
    // reading of the same thumbnail.
    hash: imageHash(image),
  };
}

// Crops to the centre square and scales it to size x size. PNG and GIF stay
// PNG so transparency survives; everything else becomes JPEG.
export async function squareImage(input: Buffer, size: number) {
  const image = await readImage(input);
  const type = image.mime === 'image/png' || image.mime === 'image/gif' ? 'image/png' : 'image/jpeg';
  image.cover({ w: size, h: size });
  const buffer =
    type === 'image/jpeg' ? await image.getBuffer('image/jpeg', { quality: 85 }) : await image.getBuffer('image/png');
  return { buffer, type };
}

function toThumb(newThumb: Awaited<ReturnType<typeof shrinkImage>>, originalUrl: string | undefined) {
  return {
    buffer: newThumb.buffer,
    hash: newThumb.hash,
    thumbWidth: newThumb.width,
    thumbHeight: newThumb.height,
    originalUrl,
    originalWidth: newThumb.originalWidth,
    originalHeight: newThumb.originalHeight,
    type: newThumb.type,
    extension: '.' + newThumb.type.split('/')[1], // '.jpeg'
  };
}

export async function createThumbFromBuffer(buffer: Buffer) {
  try {
    return toThumb(await shrinkImage(buffer, THUMB_OPTIONS), undefined);
  } catch (err) {
    log.error('save-thumb error:', err);
    throw err;
  }
}

export async function createThumbFromUrl(imageUrl: string) {
  let buffer: Buffer;
  try {
    buffer = await downloadImage(imageUrl);
  } catch (err) {
    log.error('download-image error:', err);
    throw err;
  }
  try {
    return toThumb(await shrinkImage(buffer, THUMB_OPTIONS), imageUrl);
  } catch (err) {
    log.error('save-thumb error:', err);
    throw err;
  }
}

// What a picture at a URL is, without storing anything: its size, type and
// fingerprint. For the daily jobs' check_image tool (src/server/jobs/tools.ts),
// which weighs a candidate picture before it is added to a pin.
export async function inspectImage(imageUrl: string) {
  const buffer = await downloadImage(imageUrl);
  const image = await readImage(buffer);
  return { width: image.bitmap.width, height: image.bitmap.height, type: image.mime ?? null, bytes: buffer.length, hash: imageHash(image) };
}

// The fingerprint of a picture that is already somewhere: a thumb on the CDN,
// or the original a medium was made from. Best effort - a picture that will
// not download or decode has no hash, and whatever asked is left to decide
// without one.
export async function hashImageAtUrl(imageUrl: string): Promise<string | undefined> {
  try {
    return imageHash(await readImage(await downloadImage(imageUrl)));
  } catch (err) {
    log.warn('image-hash error:', (err as Error).message);
    return undefined;
  }
}

export async function saveThumb<T extends { thumbName: string; buffer: Buffer; mimeType: string }>(thumb: T): Promise<T> {
  try {
    await azureBlob.uploadThumb(thumb.thumbName, thumb.buffer, thumb.mimeType);
    return thumb;
  } catch (err) {
    log.error('save-thumb error:', err);
    throw err;
  }
}
