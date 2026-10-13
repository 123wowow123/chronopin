-- Emoji reactions on readers' pin photos (0171), the same six as comments
-- (0075: like, love, haha, wow, sad, angry): one per person per photo, taking
-- it back deletes the row. Counted apart per kind in PinPhoto.forPin.
CREATE TABLE "PinPhotoReaction" (
  "photoId"            integer NOT NULL REFERENCES "PinPhoto" ("id") ON DELETE CASCADE,
  "userId"             integer NOT NULL REFERENCES "User" ("id") ON DELETE CASCADE,
  "reaction"           varchar(10) NOT NULL
    CONSTRAINT "CK_PinPhotoReaction_reaction" CHECK ("reaction" IN ('like', 'love', 'haha', 'wow', 'sad', 'angry')),
  "utcCreatedDateTime" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("photoId", "userId")
);
CREATE INDEX "IX_PinPhotoReaction_userId" ON "PinPhotoReaction" ("userId");
