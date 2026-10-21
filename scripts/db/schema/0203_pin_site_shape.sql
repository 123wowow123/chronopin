-- A data centre's mapped site outline and its parts, drawn on the pin page's map
-- (PinMap): the campus boundary, buildings, cooling plant, backup generators and
-- substations, as one GeoJSON FeatureCollection.
--
--   geojson     FeatureCollection of Polygon / MultiPolygon / LineString features;
--               each feature's properties.kind is 'site', 'building', 'cooling',
--               'generator', 'substation' or 'power'.
--   source      who traced them: 'Data Center Tracker' (site boundaries,
--               trackdatacenters.com) or 'Epoch AI' (satellite-annotated parts,
--               epoch.ai/data/data-centers); both when merged.
--   sourceUrl   the page or dataset the outlines came from.
--
-- One row per pin, kept apart from PinDatacenter so the map's HUD query and the
-- datacenter API never carry the outlines. Like PinPower, Pin#update() never
-- touches it.
CREATE TABLE "PinSiteShape" (
  "pinId"     integer PRIMARY KEY REFERENCES "Pin" ("id") ON DELETE CASCADE,
  "geojson"   jsonb NOT NULL,
  "source"    varchar(120) NOT NULL,
  "sourceUrl" varchar(4000),
  "checkedAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "CK_PinSiteShape_geojson" CHECK (jsonb_typeof("geojson") = 'object' AND "geojson" ->> 'type' = 'FeatureCollection')
);

