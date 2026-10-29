-- Keep the existing searchable Estimated location pill automatic for every
-- writer, including admin table patches, imports and the daily jobs. Only
-- explicit location uncertainty counts; a soft date or budget does not.
-- The original address and explanation stay intact after the prefix.
CREATE FUNCTION "pinEstimatedLocation"() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  details text;
BEGIN
  IF NEW."location" IS NULL OR btrim(coalesce(NEW."address", '')) = ''
     OR NEW."address" ~* '^estimated( location)?[[:space:]]*:' THEN
    RETURN NEW;
  END IF;

  details := regexp_replace(
    regexp_replace(coalesce(NEW."longFormSummary", ''), '<[^>]+>', ' ', 'g'),
    '[[:space:]]+', ' ', 'g');
  IF NEW."address" ~* '\m(approximate|estimated)\M'
     OR details ~* '\m(location is approximate locality|map position is approximate|approximate location)\M' THEN
    NEW."address" := 'Estimated: ' || NEW."address";
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER "Pin_estimatedLocation"
  BEFORE INSERT OR UPDATE OF "address", "location", "longFormSummary" ON "Pin"
  FOR EACH ROW EXECUTE FUNCTION "pinEstimatedLocation"();
