-- Former presidents and other retired people have a page too. The day
-- they left their office (a president's last day, a member's last day in
-- Congress); NULL for someone still serving. The index lists the people with
-- a day here, or a death day, as former officeholders.
ALTER TABLE "Person"
  ADD COLUMN "leftOfficeDate" date,
  ADD CONSTRAINT "CK_Person_left_office" CHECK ("leftOfficeDate" IS NULL OR "inOfficeSince" IS NULL OR "leftOfficeDate" >= "inOfficeSince");
