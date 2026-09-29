// Photos sent in a chat (0096), stored the moment they are pasted or picked
// so the composer can show them; the message names them on send.

import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import * as azureBlob from '../azureBlob';
import { HttpError } from '../http';
import { MESSAGE_MEDIA_PREFIX } from '../model/message';

export const MESSAGE_PHOTO_MAX_BYTES = 15 * 1024 * 1024;

// Stores one photo and returns its blob name. It is turned upright and
// brought down to 2048 pixels on its long side as a JPEG - a little larger
// than a listing photo, as pasted screenshots are mostly text.
export async function saveMessagePhoto(userId: number, file: File): Promise<string> {
  if (!/^image\//.test(file.type)) throw new HttpError(400, '', { code: 'type', message: 'Choose a photo' });
  if (file.size > MESSAGE_PHOTO_MAX_BYTES) throw new HttpError(413, '', { code: 'tooLarge', message: 'Photos can be up to 15 MB' });
  let jpeg: Buffer;
  try {
    jpeg = await sharp(Buffer.from(await file.arrayBuffer()))
      .rotate()
      .resize({ width: 2048, height: 2048, fit: 'inside', withoutEnlargement: true })
      .flatten({ background: '#ffffff' })
      .jpeg({ quality: 85 })
      .toBuffer();
  } catch {
    throw new HttpError(400, '', { code: 'type', message: 'That file is not an image we can read' });
  }
  const name = `${MESSAGE_MEDIA_PREFIX}${userId}-${randomUUID()}.jpg`;
  await azureBlob.uploadThumb(name, jpeg, 'image/jpeg');
  return name;
}
