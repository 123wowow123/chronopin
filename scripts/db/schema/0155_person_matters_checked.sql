-- The day someone searched the record for legal and ethics matters on this
-- person (court dockets, SEC and DOJ releases, congressional ethics reports,
-- reputable reporting) - and found some, or found none. NULL means nobody has
-- looked: the page then shows no misconduct meter and no record section, so
-- missing research is never read as a clean record (0154).
ALTER TABLE "Person" ADD COLUMN "mattersCheckedDate" date;
