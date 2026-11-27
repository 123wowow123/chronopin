-- A fourth publisher for the pin's data series (0062, 0098, 0241): Ornn's
-- Compute Price Index, the daily GPU rental price in USD per GPU-hour. An Ornn
-- seriesId is the GPU's name as Ornn spells it, such as "H100 SXM" or "B200".
-- Still only a handle; the prices are read on view.
ALTER TABLE "PinSeries" DROP CONSTRAINT "CK_PinSeries_source";
ALTER TABLE "PinSeries" ADD CONSTRAINT "CK_PinSeries_source" CHECK ("source" IN ('eia', 'fred', 'epoch', 'ornn'));
