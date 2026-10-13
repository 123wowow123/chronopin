import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import * as azureBlob from '../azureBlob';
import { HttpError } from '../http';

export const PIN_PHOTO_MAX_BYTES = 15 * 1024 * 1024;
export const PIN_PHOTO_PREFIX = 'user-photo-';

// Stores one reader's photo: turned upright (phone cameras record rotation in
// EXIF, which is then dropped), brought down to 2048 pixels on its long side
// as a JPEG. Resolves its blob name and size.
export async function savePinPhoto(userId: number, file: File) {
  if (!/^image\//.test(file.type)) throw new HttpError(400, '', { code: 'type', message: 'Choose a photo' });
  if (file.size > PIN_PHOTO_MAX_BYTES) throw new HttpError(413, '', { code: 'tooLarge', message: 'Photos can be up to 15 MB' });
  let jpeg: { data: Buffer; info: { width: number; height: number } };
  try {
    jpeg = await sharp(Buffer.from(await file.arrayBuffer()))
      .rotate()
      .resize({ width: 2048, height: 2048, fit: 'inside', withoutEnlargement: true })
      .flatten({ background: '#ffffff' })
      .jpeg({ quality: 85 })
      .toBuffer({ resolveWithObject: true });
  } catch {
    throw new HttpError(400, '', { code: 'type', message: 'That file is not an image we can read' });
  }
  const blobName = `${PIN_PHOTO_PREFIX}${userId}-${randomUUID()}.jpg`;
  await azureBlob.uploadThumb(blobName, jpeg.data, 'image/jpeg');
  return { blobName, width: jpeg.info.width, height: jpeg.info.height };
}
