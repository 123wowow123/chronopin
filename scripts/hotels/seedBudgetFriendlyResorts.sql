-- Retired: this fixed-ID seed overwrote unrelated data-center records.
-- See docs/okf/scraping/resort-collision-repair-2026-10-28.md.
-- Intentionally contains no data writes, even when psql continues on errors.
DO $$ BEGIN
  RAISE EXCEPTION 'Retired unsafe resort seed. Use authenticated management APIs with source-URL identity and database-allocated IDs.';
END $$;
