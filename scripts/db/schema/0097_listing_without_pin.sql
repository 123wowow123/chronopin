-- A listing posted from Create's Marketplace tab stands on its own, with no
-- pin behind it: its kind is the seller's pick rather than the pin's. It
-- shows on the map's Marketplace layer and the seller's Listings page.
ALTER TABLE "Listing" ALTER COLUMN "pinId" DROP NOT NULL;
