-- What an ad's Amazon page says to hurry a buyer, read with the rest of the
-- listing by the 6am/6pm news job's pinAds and holidayAds tasks: "left:12"
-- (Only 12 left in stock) or "low:90" (lowest price in 90 days), else NULL.
-- The ad tile shows it in place of the brand and stars (src/lib/ads.ts,
-- parseUrgency).
ALTER TABLE "PinAd" ADD COLUMN "urgency" varchar(12) CHECK ("urgency" ~ '^(left|low):[0-9]{1,3}$');
ALTER TABLE "HolidayAd" ADD COLUMN "urgency" varchar(12) CHECK ("urgency" ~ '^(left|low):[0-9]{1,3}$');
