-- A third publisher for the pin's data series (0062, 0098): Epoch AI, whose
-- public data-center timeline CSV carries each AI campus's modelled IT power,
-- H100-equivalent compute and capital cost at every dated satellite reading,
-- with projections for buildings not yet operating.
--
-- An Epoch seriesId is "<campus slug>:<metric>", metric one of it (IT power,
-- MW), h100e (compute) or cost (capital cost, 2025 USD billions): for example
-- "meta-los-lunas:it". Still only a handle; the points are read on view.
ALTER TABLE "PinSeries" DROP CONSTRAINT "CK_PinSeries_source";
ALTER TABLE "PinSeries" ADD CONSTRAINT "CK_PinSeries_source" CHECK ("source" IN ('eia', 'fred', 'epoch'));
