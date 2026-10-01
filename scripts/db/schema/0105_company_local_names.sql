-- A company's names in the site's languages that are not written in Latin
-- letters (古驰, 구찌, غوتشي for Gucci), from its Wikidata labels and aliases.
-- Search reads them to hand the semantic model the name it knows: typed in
-- another script, a brand is one it has never seen (companyNames.ts). Null
-- until looked up; an empty list when Wikidata had none.
ALTER TABLE "Company" ADD COLUMN "localNames" text[];
ALTER TABLE "Company" ADD COLUMN "utcLocalNamesCheckedDateTime" timestamptz;
