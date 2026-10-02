-- Whether the viewer an ad was served to was signed in (0110), so the admin
-- ad stats can split shown and click-through by signed-in users and guests.
-- Impressions before this were not told apart and count as guests.
ALTER TABLE "AdImpression" ADD COLUMN "signedIn" boolean NOT NULL DEFAULT false;
ALTER TABLE "AdImpression" DROP CONSTRAINT "AdImpression_pkey";
ALTER TABLE "AdImpression" ADD PRIMARY KEY ("day", "adKey", "slot", "store", "signedIn");
