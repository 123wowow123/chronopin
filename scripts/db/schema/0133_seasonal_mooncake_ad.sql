-- Owner-approved 2026-10-06 exception: no alternative mooncakes remain this
-- season. Amazon US was read today: $24.99, 3.7 stars, 3 reviews, in stock.
-- Keep the actual review facts. The exception ends with the existing
-- Mid-Autumn window (September 25 + 21 days), not next year's season.
-- A database guard also covers the already-deployed daily checker without
-- requiring an app rebuild. Stock, brand and missing-listing failures stand.
CREATE FUNCTION "seasonalMooncakeReviewException"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."holiday" = 'mid-autumn' AND NEW."asin" = 'B0CHSLGCDQ'
     AND (now() AT TIME ZONE 'UTC')::date BETWEEN DATE '2026-10-06' AND DATE '2026-10-16'
     AND OLD."status" = 'ok' AND NEW."status" = 'broken'
     AND NEW."price" > 0 AND length(NEW."brand") > 0
     AND (NEW."problem" ~ '^only [0-9]+ reviews \(need [0-9]+\)$'
          OR NEW."problem" ~ '^rated [0-9.]+ \(need [0-9.]+\)$') THEN
    NEW."status" := 'ok';
    NEW."problem" := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "seasonalMooncakeReviewException"
BEFORE UPDATE ON "HolidayAd"
FOR EACH ROW EXECUTE FUNCTION "seasonalMooncakeReviewException"();

INSERT INTO "HolidayAd"
  ("holiday", "asin", "url", "title", "brand", "price", "rating", "reviewCount", "image", "tier", "urgency", "status", "problem")
SELECT 'mid-autumn', 'B0CHSLGCDQ', 'https://www.amazon.com/dp/B0CHSLGCDQ',
  'Spot of Joy Wintermelon Flavor Mooncake 1 Yolk (4 Count 640Grams)',
  'Spot of Joy', 24.99, 3.7, 3,
  'https://m.media-amazon.com/images/I/8139M0YWvZL._AC_SL300_.jpg',
  'mid', 'left:6', 'ok', NULL
WHERE (now() AT TIME ZONE 'UTC')::date BETWEEN DATE '2026-10-06' AND DATE '2026-10-16'
ON CONFLICT ("holiday", "asin") DO UPDATE SET
  "url" = EXCLUDED."url", "title" = EXCLUDED."title", "brand" = EXCLUDED."brand",
  "price" = EXCLUDED."price", "rating" = EXCLUDED."rating", "reviewCount" = EXCLUDED."reviewCount",
  "image" = EXCLUDED."image", "tier" = EXCLUDED."tier", "urgency" = EXCLUDED."urgency",
  "status" = 'ok', "problem" = NULL, "checkedDateTime" = now();
