---
type: API Endpoint
title: Reader photos on a pin
description: Signed-in readers add photos to a pin from their own device, and other readers can flag them; hidden photos wait for an admin.
resource: "../../../src/app/api/pins/[id]/photos/route.ts"
tags: [api, pins, photos]
---

# Reader photos on a pin (0171)

The "Your photos" pane on the pin page (`src/components/pin/PinPhotos.tsx`) is separate from the pin's sourced media. Readers add photos from their own device; other signed-in readers can flag them.

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/pins/:id/photos` | Public. Newest first, up to 100. Signed-in readers get `mine`/`flagged`; a reader still sees their own hidden photos. |
| POST | `/api/pins/:id/photos` | Multipart `file` (+ optional `caption`, 200 chars). Signed-up user with a confirmed email. 15 MB, 20 a day (admins exempt). Stored as a 2048px JPEG in the thumb container as `user-photo-<userId>-<uuid>.jpg`. |
| DELETE | `/api/pins/:id/photos/:photoId` | Own photo, or any for an admin. Soft delete. |
| POST | `/api/pins/:id/photos/:photoId/flag` | `{reason: wrong\|inappropriate\|spam\|private\|other, note?}`. One flag per reader, not on your own photo. `PIN_PHOTO_HIDE_AT` (3) different readers hide the photo until an admin acts. |

Tables: `PinPhoto`, `PinPhotoFlag`. Not yet built: an admin queue for hidden/flagged photos (restore or delete), and photos in search or `PinBaseView`.

## Attach photos when submitting a review

Migration `0248_review_photos.sql` adds optional `PinPhoto.reviewId`. A dish review can attach
up to five images, each at most 15 MB. Use multipart `PUT /api/pins/:id/reviews?item=<dish>`
with `stars` (1–5), optional `comment`, repeated `photos` file fields, and optional
`removePhotoIds` (a JSON array of existing attachment IDs). JSON-only review PUTs remain
supported, including attachment removal with `removePhotoIds`.

The existing verified-email, image conversion/Azure storage and daily upload limits apply.
The review and photo rows commit together, and failed submissions clean up newly uploaded
blobs. Removal IDs must belong to the saved review and reader. Reviews return a `photos`
array with `id`, `blobName`, `width`, `height`, `caption` and `hidden`. Hidden attachments
are returned only to their owner. Removing the review also soft-deletes its attachments;
normal per-photo deletion and reporting remain available through the photo APIs.
