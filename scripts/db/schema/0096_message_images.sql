-- Photos in a chat: pasted into the composer or picked with its photo button,
-- up to ten with or without text. Blob names in the thumb container
-- ("message/<userId>-<uuid>.jpg"), as listing photos are. Unsending wipes
-- them with the text; a report keeps them as it keeps the text.
ALTER TABLE "Message" ADD COLUMN "images" text[] NOT NULL DEFAULT '{}';
ALTER TABLE "Message" ADD CONSTRAINT "CK_Message_images" CHECK (cardinality("images") <= 10);

ALTER TABLE "Message" DROP CONSTRAINT "CK_Message_body";
ALTER TABLE "Message" ADD CONSTRAINT "CK_Message_body"
  CHECK (("utcUnsentDateTime" IS NOT NULL AND "body" = '' AND cardinality("images") = 0)
      OR (char_length("body") <= 4000 AND (char_length("body") >= 1 OR cardinality("images") > 0)));

ALTER TABLE "MessageReport" ADD COLUMN "images" text[] NOT NULL DEFAULT '{}';
