-- A setlist market's songs on a Contenders list (which songs a headliner plays):
-- a 'setlist' category (name = the song, artist = who is credited on it) and a
-- 'played' price label ("market price to be played"). Rows play previews the
-- same way entries do (0257).
ALTER TABLE "PinCandidate" DROP CONSTRAINT "CK_PinCandidate_category";
ALTER TABLE "PinCandidate" ADD CONSTRAINT "CK_PinCandidate_category" CHECK ("category" IN ('record', 'album', 'song', 'artist', 'entry', 'setlist'));
ALTER TABLE "PinCandidate" DROP CONSTRAINT "CK_PinCandidate_oddsLabel";
ALTER TABLE "PinCandidate" ADD CONSTRAINT "CK_PinCandidate_oddsLabel" CHECK ("oddsLabel" IS NULL OR "oddsLabel" IN ('nominee', 'winner', 'played'));
