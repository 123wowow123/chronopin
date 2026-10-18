-- A short line on why a product is good, for the /products landing page
-- ("Ranked #1 ... featuring active noise cancellation"). One row per pin.
-- Like PinEventInfo this is looked-up data: Pin#update() never touches it, so
-- editing a pin cannot wipe it, and it is not in PinBaseView - only the
-- products page reads it. A product with no row shows its pin's description.
CREATE TABLE "ProductBlurb" (
  "pinId"      integer PRIMARY KEY REFERENCES "Pin" ("id") ON DELETE CASCADE,
  "blurb"      varchar(400) NOT NULL,
  "sourceUrl"  varchar(4000),
  "updatedAt"  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "CK_ProductBlurb_blurb" CHECK (length(btrim("blurb")) > 0)
);
