-- Chart names used as pin tags can run past 80 characters (e.g. an annual chart with its
-- window and ranking basis spelled out), so a tag name may now be up to 200 characters.
ALTER TABLE "PinTag" DROP CONSTRAINT "CK_PinTag_name";
ALTER TABLE "PinTag" ADD CONSTRAINT "CK_PinTag_name" CHECK (length("name") BETWEEN 1 AND 200);
