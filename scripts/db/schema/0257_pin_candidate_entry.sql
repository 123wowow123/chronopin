-- Contest entries on a pin's Contenders list (Eurovision Asia and the like):
-- a new 'entry' category (name = the song, artist = who sings it and for
-- which country) and an optional audio preview the list plays through the
-- global music player.
--
--   previewUrl   a direct audio preview (about 30 s) of the song, NULL when
--                none was found; no play button is shown without it.
ALTER TABLE "PinCandidate" ADD COLUMN "previewUrl" varchar(4000);
ALTER TABLE "PinCandidate" DROP CONSTRAINT "CK_PinCandidate_category";
ALTER TABLE "PinCandidate" ADD CONSTRAINT "CK_PinCandidate_category" CHECK ("category" IN ('record', 'album', 'song', 'artist', 'entry'));
