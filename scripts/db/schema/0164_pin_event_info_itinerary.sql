-- What a ticket includes, day by day, for a package (a three-day wine weekend,
-- a festival pass): the pin page shows it as a table in the tickets section.
--
--   itinerary  [{ label, items: [text] }] in running order: label is the day or
--              part ("Thursday, October 22"), items what it holds. Empty when
--              the page lists none.
ALTER TABLE "PinEventInfo"
  ADD COLUMN "itinerary" jsonb NOT NULL DEFAULT '[]',
  ADD CONSTRAINT "CK_PinEventInfo_itinerary" CHECK (jsonb_typeof("itinerary") = 'array');
