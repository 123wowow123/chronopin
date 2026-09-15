// Image downloads, resizing and storage for pin media and profile pictures.

import { Jimp } from 'jimp';
import * as azureBlob from './azureBlob';
import config from './config';
import log from './util/log';

const THUMB_OPTIONS = {
  width: config.thumbWidth,
  uploadImageWidth: config.uploadImageWidth,
};

// Wikimedia's CDN (thumb.wikimedia.org, and others) 403s any request with no
// User-Agent. A browser-like UA is enough to pass.
const DOWNLOAD_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; Chronopin/1.0)',
};

export async function downloadImage(imgUrl: string): Promise<Buffer> {
  const res = await fetch(imgUrl, { headers: DOWNLOAD_HEADERS });
  if (!res.ok) {
    throw new Error(`Image download failed with ${res.status}: ${imgUrl}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

// Scales an image down to uploadImageWidth when it is wider, keeping its type.
export async function shrinkImage(input: Buffer, options: typeof THUMB_OPTIONS) {
  const image = await Jimp.read(input);
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
  };
}

// Crops to the centre square and scales it to size x size. PNG and GIF stay
// PNG so transparency survives; everything else becomes JPEG.
export async function squareImage(input: Buffer, size: number) {
  const image = await Jimp.read(input);
  const type = image.mime === 'image/png' || image.mime === 'image/gif' ? 'image/png' : 'image/jpeg';
  image.cover({ w: size, h: size });
  const buffer =
    type === 'image/jpeg' ? await image.getBuffer('image/jpeg', { quality: 85 }) : await image.getBuffer('image/png');
  return { buffer, type };
}

function toThumb(newThumb: Awaited<ReturnType<typeof shrinkImage>>, originalUrl: string | undefined) {
  return {
    buffer: newThumb.buffer,
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

export async function saveThumb<T extends { thumbName: string; buffer: Buffer; mimeType: string }>(thumb: T): Promise<T> {
  try {
    await azureBlob.uploadThumb(thumb.thumbName, thumb.buffer, thumb.mimeType);
    return thumb;
  } catch (err) {
    log.error('save-thumb error:', err);
    throw err;
  }
}
