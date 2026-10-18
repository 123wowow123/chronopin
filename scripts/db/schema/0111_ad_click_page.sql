-- Where on the site an ad click happened (0110): the page's path and query as
-- the browser had it ("/en/search?q=…", "/ja/pin/12/…"), beside the slot and
-- pin already kept. Null for clicks before this.
ALTER TABLE "AdClick" ADD COLUMN "page" text CHECK (length("page") <= 500);
