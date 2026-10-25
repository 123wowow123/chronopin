-- Earlier editions of a projection that its publisher has since revised, drawn
-- as a grey dotted line beneath the current one: [{ label, publishedDate, points }].
ALTER TABLE "IndustryForecast" ADD COLUMN "earlier" jsonb NOT NULL DEFAULT '[]'
  CONSTRAINT "CK_IndustryForecast_earlier" CHECK (jsonb_typeof("earlier") = 'array');
