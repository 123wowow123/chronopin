# Reader photos on a pin (0171)

The "Your photos" pane on the pin page (`src/components/pin/PinPhotos.tsx`) is separate from the pin's sourced media. Readers add photos from their own device; other signed-in readers can flag them.

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/pins/:id/photos` | Public. Newest first, up to 100. Signed-in readers get `mine`/`flagged`; a reader still sees their own hidden photos. |
| POST | `/api/pins/:id/photos` | Multipart `file` (+ optional `caption`, 200 chars). Signed-up user with a confirmed email. 15 MB, 20 a day (admins exempt). Stored as a 2048px JPEG in the thumb container as `user-photo-<userId>-<uuid>.jpg`. |
| DELETE | `/api/pins/:id/photos/:photoId` | Own photo, or any for an admin. Soft delete. |
| POST | `/api/pins/:id/photos/:photoId/flag` | `{reason: wrong\|inappropriate\|spam\|private\|other, note?}`. One flag per reader, not on your own photo. `PIN_PHOTO_HIDE_AT` (3) different readers hide the photo until an admin acts. |

Tables: `PinPhoto`, `PinPhotoFlag`. Not yet built: an admin queue for hidden/flagged photos (restore or delete), and photos in search or `PinBaseView`.
