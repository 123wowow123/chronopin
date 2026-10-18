import { randomUUID } from 'node:crypto';
import * as azureBlob from '../azureBlob';
import { squareImage } from '../image';
import User from '../model/user';
import { HttpError } from '../util/httpError';

// Uploaded pictures are blobs in the thumb container under this prefix, and
// pictureUrl stores the blob name rather than a full URL - the same as
// Medium.thumbName, so the stored value does not depend on which storage
// account (Azurite locally) the app runs against. A social login's photo
// stays a full URL; blobUrl() in src/lib/appConfig tells the two apart.
const PICTURE_PREFIX = 'avatar/';
const PICTURE_SIZE = 256;
export const MAX_PICTURE_BYTES = 5 * 1024 * 1024;

function isUploadedPicture(pictureUrl: string | null | undefined): pictureUrl is string {
  return typeof pictureUrl === 'string' && pictureUrl.startsWith(PICTURE_PREFIX);
}

// A leftover blob is harmless, so a failed delete does not fail the request.
async function deleteUploadedPicture(pictureUrl: string | null | undefined) {
  if (isUploadedPicture(pictureUrl)) {
    await azureBlob.deleteThumb(pictureUrl).catch((err) => console.log(`User picture '${pictureUrl}' delete err:`, err));
  }
}

// Loads the row fresh: an update writes every column from the object, so
// updating anything but a freshly loaded user would clear what it lacks.
export async function loadUser(userId: number): Promise<User> {
  const { user } = await User.getById(userId);
  if (!user) {
    throw new HttpError(401, 'Unauthorized');
  }
  return user;
}

// Crops the upload to a square, stores it, points the user at it, then
// deletes the picture it replaced.
export async function setPicture(userId: number, file: File): Promise<string> {
  if (file.size > MAX_PICTURE_BYTES) {
    throw new HttpError(413, 'Pictures can be up to 5 MB', { message: 'Pictures can be up to 5 MB' });
  }
  if (!/^image\//.test(file.type)) {
    throw new HttpError(400, 'Choose an image to upload', { message: 'Choose an image to upload' });
  }

  let squared: { buffer: Buffer; type: string };
  try {
    squared = await squareImage(Buffer.from(await file.arrayBuffer()), PICTURE_SIZE);
  } catch {
    throw new HttpError(400, 'That file is not an image we can read', { message: 'That file is not an image we can read' });
  }

  const blobName = `${PICTURE_PREFIX}${userId}-${randomUUID()}.${squared.type === 'image/png' ? 'png' : 'jpg'}`;
  await azureBlob.uploadThumb(blobName, squared.buffer, squared.type);

  const user = await loadUser(userId);
  const previous = user.pictureUrl;
  user.pictureUrl = blobName;
  await user.patchWithoutPassword();
  await deleteUploadedPicture(previous);
  return blobName;
}

export async function removePicture(userId: number) {
  const user = await loadUser(userId);
  const previous = user.pictureUrl;
  user.pictureUrl = null;
  await user.patchWithoutPassword();
  await deleteUploadedPicture(previous);
}
