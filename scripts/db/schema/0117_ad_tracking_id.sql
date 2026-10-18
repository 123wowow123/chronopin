-- Which Associates tracking id (the "tag" on the Amazon link) each ad was shown
-- and clicked with, so the admin Ads page can tell the ids apart: the id of a
-- store changes when an admin sets another one, and each id is paid and
-- reported on its own in Associates Central.
--
-- AdImpression: the id is part of the key. Rows before this were all served
-- with the US id (no other store had one), so they get it.
ALTER TABLE "AdImpression" ADD COLUMN "tag" varchar(40) NOT NULL DEFAULT '';
UPDATE "AdImpression" SET "tag" = 'chronopin04-20' WHERE "store" = 'US';
ALTER TABLE "AdImpression" DROP CONSTRAINT "AdImpression_pkey";
ALTER TABLE "AdImpression" ADD PRIMARY KEY ("day", "adKey", "slot", "store", "signedIn", "tag");

-- AdClick: the id of the link that was clicked, which the stored url already
-- carried ("...?tag=chronopin04-20"); null when the link had none.
ALTER TABLE "AdClick" ADD COLUMN "tag" varchar(40);
UPDATE "AdClick" SET "tag" = substring("url" from '[?&]tag=([\w-]{1,40})') WHERE "tag" IS NULL;
