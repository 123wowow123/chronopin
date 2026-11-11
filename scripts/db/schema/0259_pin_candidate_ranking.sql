-- Artists in the running for a ranking market (Spotify's most-streamed artist of
-- the year): a 'ranking' category (name = the artist, artist = the track the
-- row previews). Rows play previews the same way entries and setlist songs do.
ALTER TABLE "PinCandidate" DROP CONSTRAINT "CK_PinCandidate_category";
ALTER TABLE "PinCandidate" ADD CONSTRAINT "CK_PinCandidate_category" CHECK ("category" IN ('record', 'album', 'song', 'artist', 'entry', 'setlist', 'ranking'));
