-- The language a pin page view was read in (the page's /es, /fr ... prefix; English for the plain
-- path), so the admin Views page can split views by language. A view is still one row per viewer
-- per pin per UTC day (0014), so this is the day's first view's. Views recorded before this have
-- none ("unknown").

ALTER TABLE "PinView" ADD COLUMN "locale" varchar(5);
