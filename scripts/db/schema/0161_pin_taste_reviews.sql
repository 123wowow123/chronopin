-- Independent tasting reviews behind a taste profile: a list of
-- {url, title, publishedDate, quote}, shown under the radar. A review is a
-- page that describes how THIS product tastes (not an announcement), fetched
-- by whoever stored it; `quote` is a short extract. Kept here, not in
-- PinReference, because those rows are date evidence and feed the pin's date
-- confidence, which a taste review says nothing about.
ALTER TABLE "PinTaste" ADD COLUMN "reviews" jsonb NOT NULL DEFAULT '[]';
ALTER TABLE "PinTaste" ADD CONSTRAINT "CK_PinTaste_reviews" CHECK (jsonb_typeof("reviews") = 'array');
