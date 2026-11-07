import * as db from '@/server/db';
import * as azureBlob from '@/server/azureBlob';
import { HttpError } from '@/server/http';
import PinReview from '@/server/model/pinReview';
import PinPhoto, { PIN_PHOTO_DAILY_LIMIT } from '@/server/model/pinPhoto';
import { savePinPhoto } from './pinPhotos';
import { REVIEW_PHOTO_MAX, REVIEW_PHOTO_MAX_BYTES } from '@/lib/userReviews';

// Blob preparation precedes the transaction; failed submissions clean up their
// new blobs, and a single commit attaches photos to the saved review.
export async function saveReviewWithPhotos(input: { pinId: number; userId: number; isAdmin: boolean; stars: number; comment: string | null; menuItem: string; files: File[]; removePhotoIds: number[] }) {
  const { files, removePhotoIds } = input;
  if (files.length > REVIEW_PHOTO_MAX || removePhotoIds.length > REVIEW_PHOTO_MAX) throw new HttpError(400, `At most ${REVIEW_PHOTO_MAX} photos per review`);
  if (files.some((file) => !file.size || !file.type.startsWith('image/'))) throw new HttpError(400, '', { code: 'type', message: 'Choose an image' });
  if (files.some((file) => file.size > REVIEW_PHOTO_MAX_BYTES)) throw new HttpError(413, '', { code: 'tooLarge', message: 'Photos can be up to 15 MB' });
  if (!input.isAdmin && files.length && (await PinPhoto.countToday(input.userId)) + files.length > PIN_PHOTO_DAILY_LIMIT) throw new HttpError(429, 'Daily photo upload limit reached');
  const stored: Awaited<ReturnType<typeof savePinPhoto>>[] = [];
  try {
    for (const file of files) stored.push(await savePinPhoto(input.userId, file));
    return await db.transaction(async (query) => {
      const review = await PinReview.save(input.pinId, input.userId, input.stars, input.comment, input.menuItem, query);
      const existing = review.photos ?? [];
      if (removePhotoIds.some((id) => !existing.some((photo) => photo.id === id))) throw new HttpError(400, 'Photo does not belong to this review');
      if (existing.length - removePhotoIds.length + stored.length > REVIEW_PHOTO_MAX) throw new HttpError(400, `At most ${REVIEW_PHOTO_MAX} photos per review`);
      if (removePhotoIds.length) await query(`UPDATE "PinPhoto" SET "utcDeletedDateTime" = now() WHERE "reviewId" = $1 AND "userId" = $2 AND "id" = ANY($3::int[])`, [review.id, input.userId, removePhotoIds]);
      for (const photo of stored) {
        await PinPhoto.create({ pinId: input.pinId, userId: input.userId, reviewId: review.id, ...photo, caption: input.menuItem || null, stars: input.stars }, query);
      }
      return (await PinReview.forPin(input.pinId, input.userId, input.menuItem, query)).find((row) => row.mine)!;
    });
  } catch (error) {
    await Promise.allSettled(stored.map((photo) => azureBlob.deleteThumb(photo.blobName)));
    throw error;
  }
}
