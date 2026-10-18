-- A second publisher for the pin's data series (0062): FRED, the St. Louis
-- Fed's database, which republishes BEA's PCE price index, BLS's CPI and the
-- rest of the macro releases, so a central-bank or inflation pin can draw the
-- gauge it is about. 0062 said the source column existed so that a second
-- publisher would not need a second table; only its CHECK has to widen.
--
-- A FRED seriesId may carry a units code after a colon ("PCEPI:PC1" is the PCE
-- price index as a percent change from a year ago, the figure the Fed
-- targets), still only a handle: the numbers are read on view.
ALTER TABLE "PinSeries" DROP CONSTRAINT "CK_PinSeries_source";
ALTER TABLE "PinSeries" ADD CONSTRAINT "CK_PinSeries_source" CHECK ("source" IN ('eia', 'fred'));

-- The pin cache (0072) copies PinBaseView, which carries a pin's series
-- handles, but PinSeries never got its refresh triggers: 0062 predates the
-- cache, so the SPR pins were carried over by the rebuild and a series
-- attached to any newer pin stayed out of the cache - and off the page -
-- until something else touched the pin. Same three triggers as 0072's list.
CREATE TRIGGER "PinSeries_pinBaseCache_ins" AFTER INSERT ON "PinSeries"
  REFERENCING NEW TABLE AS new_rows
  FOR EACH STATEMENT EXECUTE FUNCTION "pinBaseCacheTouch"('pinId');
CREATE TRIGGER "PinSeries_pinBaseCache_upd" AFTER UPDATE ON "PinSeries"
  REFERENCING OLD TABLE AS old_rows NEW TABLE AS new_rows
  FOR EACH STATEMENT EXECUTE FUNCTION "pinBaseCacheTouch"('pinId');
CREATE TRIGGER "PinSeries_pinBaseCache_del" AFTER DELETE ON "PinSeries"
  REFERENCING OLD TABLE AS old_rows
  FOR EACH STATEMENT EXECUTE FUNCTION "pinBaseCacheTouch"('pinId');
