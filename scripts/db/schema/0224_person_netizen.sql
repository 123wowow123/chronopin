-- Netizens: people and publications known for what they post online (a
-- Substack author, say) rather than an office or a career. They have a page
-- like anyone's (/person/<slug>) and a Netizens tab on /people. The premium
-- trader positions (0223) hang off these pages, so the trader slugs become the
-- pages' slugs.
ALTER TABLE "Person" DROP CONSTRAINT "CK_Person_role";
ALTER TABLE "Person" ADD CONSTRAINT "CK_Person_role" CHECK ("role" IN (
  'president', 'vice-president', 'cabinet', 'senator', 'representative', 'governor', 'politician',
  'business', 'entertainment', 'sports', 'arts', 'science', 'media', 'netizen', 'other'));

INSERT INTO "Person" ("name", "slug", "role", "office", "jurisdiction", "description", "websiteUrl") VALUES
  ('HFI Research', 'hfi-research', 'netizen', 'Substack author, HFI Research', 'Online',
   'Contrarian investment research on energy (oil and natural gas), published on Substack with trade alerts for its model portfolio.',
   'https://www.hfir.com/'),
  ('Le Shrub', 'le-shrub', 'netizen', 'Substack author, Reminiscences of a Shrub Operator', 'Online',
   'Pseudonymous markets writer behind the Shrubstack Substack, which calls itself a parody trading blog and shares the trades it takes.',
   'https://www.shrubstack.com/')
ON CONFLICT DO NOTHING;

UPDATE "TraderPosition" SET "traderSlug" = 'hfi-research' WHERE "traderSlug" = 'hfir';
UPDATE "TraderPosition" SET "traderSlug" = 'le-shrub', "traderName" = 'Le Shrub' WHERE "traderSlug" = 'shrubstack';
