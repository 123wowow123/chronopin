-- Independent reviews behind a car performance rubric: a list of
-- {url, title, publishedDate, quote}, shown under the radar the way PinTaste's
-- are (0161). A review is a page that describes how THIS model drives or
-- performs (a road test or hands-on review, not the launch announcement),
-- fetched by whoever stored it; `quote` is a short extract. Kept here, not in
-- PinReference, because those rows are date evidence and feed the pin's date
-- confidence, which a road test says nothing about.
ALTER TABLE "PinCarPerf" ADD COLUMN "reviews" jsonb NOT NULL DEFAULT '[]';
ALTER TABLE "PinCarPerf" ADD CONSTRAINT "CK_PinCarPerf_reviews" CHECK (jsonb_typeof("reviews") = 'array');
