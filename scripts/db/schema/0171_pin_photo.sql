-- Photos readers add to a pin from their own device (the "Your photos" pane on
-- the pin page), kept apart from the pin's own media: those are sourced and
-- credited by the curator, these are community contributions.
--
--   blobName    the stored JPEG in the thumb container (user-photo-<userId>-<uuid>.jpg)
--   caption     optional, up to 200 characters, written by the uploader
--   status      'visible', or 'hidden' once enough readers flagged it (PIN_PHOTO_HIDE_AT
--               in the model) or an admin hid it; hidden photos stay out of
--               the gallery until an admin restores or deletes them
--
-- Posting needs a signed-up user, so userId is NOT NULL. Deleting a photo is
-- soft (utcDeletedDateTime) so flags and the audit trail survive.
CREATE TABLE "PinPhoto" (
  "id"                 serial PRIMARY KEY,
  "pinId"              integer NOT NULL REFERENCES "Pin" ("id") ON DELETE CASCADE,
  "userId"             integer NOT NULL REFERENCES "User" ("id") ON DELETE CASCADE,
  "blobName"           text NOT NULL,
  "width"              integer,
  "height"             integer,
  "caption"            text,
  "status"             text NOT NULL DEFAULT 'visible' CHECK ("status" IN ('visible', 'hidden')),
  "utcCreatedDateTime" timestamptz NOT NULL DEFAULT now(),
  "utcDeletedDateTime" timestamptz
);
CREATE INDEX "PinPhoto_pinId_idx" ON "PinPhoto" ("pinId", "utcCreatedDateTime" DESC) WHERE "utcDeletedDateTime" IS NULL;
CREATE INDEX "PinPhoto_userId_idx" ON "PinPhoto" ("userId", "utcCreatedDateTime" DESC);

-- One flag per reader per photo.
--   reason      'wrong' (not this place/thing), 'inappropriate', 'spam', 'private' (shows a person or private info), 'other'
--   resolvedDateTime  set when an admin has looked at the photo
CREATE TABLE "PinPhotoFlag" (
  "photoId"            integer NOT NULL REFERENCES "PinPhoto" ("id") ON DELETE CASCADE,
  "userId"             integer NOT NULL REFERENCES "User" ("id") ON DELETE CASCADE,
  "reason"             text NOT NULL CHECK ("reason" IN ('wrong', 'inappropriate', 'spam', 'private', 'other')),
  "note"               text,
  "utcCreatedDateTime" timestamptz NOT NULL DEFAULT now(),
  "utcResolvedDateTime" timestamptz,
  PRIMARY KEY ("photoId", "userId")
);
