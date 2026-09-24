-- A picture for a company's product line (PinSentiment.product, 0070) that
-- none of its pins has one for: the Major products panel shows it instead of a
-- blank tile. Found on the dev machine by `npm run products:pictures`
-- (Wikipedia's lead image, then Google image search) - prod only stores what
-- a local run sends it. pictureUrl NULL means looked for and nothing found,
-- so the product is not looked up again unless asked (--retry).
CREATE TABLE "ProductPicture" (
  "companyId"          integer NOT NULL REFERENCES "Company" ("id") ON DELETE CASCADE,
  "product"            citext NOT NULL,
  "pictureUrl"         text,
  -- 'wikipedia', 'google' or 'hand', and the page it was found on.
  "source"             text,
  "pageUrl"            text,
  "utcCheckedDateTime" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("companyId", "product")
);
