-- What a PinOutcomePhoto shows: a 'person' (cropped square on the face), a
-- 'logo' (a team crest, party, company, flag: fitted whole on white) or a
-- 'cover' (a film poster, album cover or game box art: fitted whole). `person`
-- then holds the name of the thing pictured.
ALTER TABLE "PinOutcomePhoto" ADD COLUMN "kind" varchar(10) NOT NULL DEFAULT 'person' CHECK ("kind" IN ('person','logo','cover'));
