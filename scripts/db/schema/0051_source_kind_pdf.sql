-- A source may now be a PDF. Filings, agency dockets, environmental
-- statements and regulator letters are often the only source an
-- infrastructure, energy, policy or health pin has, and the reader can now
-- take their text (src/server/scrape/pdfText.ts): the text layer where there
-- is one, OCR of the first pages where the document is a scan.
--
-- Without this the kind constraint rejected the row and the save failed after
-- the fetch had already succeeded.

ALTER TABLE "Source" DROP CONSTRAINT IF EXISTS "CK_Source_kind";
ALTER TABLE "Source" ADD CONSTRAINT "CK_Source_kind" CHECK ("kind" IN ('web', 'youtube', 'tweet', 'podcast', 'pdf'));
