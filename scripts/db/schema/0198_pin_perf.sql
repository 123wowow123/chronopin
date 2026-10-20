-- The published performance figures of a piece of hardware (an accelerator, a
-- rack system, a processor): bar charts that put the pin's part beside its
-- predecessor or rivals, and spec tables. The pin page draws them under the
-- pin's own details; a chart or table is a vendor's or a benchmark body's
-- numbers, never an estimate, and each one names the page it came from.
--
--   charts  [{ title, unit, higherIsBetter?, note?, sourceUrl?,
--              bars: [{ label, value, highlight? }] }]
--           highlight marks the pin's own part; bars are drawn in the order given.
--   tables  [{ title, columns: [text], rows: [[text]], note?, sourceUrl? }]
--           columns[0] heads the row labels; every row has one cell per column.
--
-- One row per pin, at least one chart or table. Like PinPower and
-- PinEventInfo, Pin#update() never touches it, so editing a pin cannot wipe
-- it, and it is not in PinBaseView.
CREATE TABLE "PinPerf" (
  "pinId"     integer PRIMARY KEY REFERENCES "Pin" ("id") ON DELETE CASCADE,
  "charts"    jsonb NOT NULL DEFAULT '[]',
  "tables"    jsonb NOT NULL DEFAULT '[]',
  "checkedAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "CK_PinPerf_charts" CHECK (jsonb_typeof("charts") = 'array'),
  CONSTRAINT "CK_PinPerf_tables" CHECK (jsonb_typeof("tables") = 'array'),
  CONSTRAINT "CK_PinPerf_any" CHECK (jsonb_array_length("charts") + jsonb_array_length("tables") > 0)
);
