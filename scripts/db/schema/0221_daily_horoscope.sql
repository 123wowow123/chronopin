-- One written reading per sun sign per UTC day, made the first time anyone
-- asks for it and shared by every viewer of that sign after.
CREATE TABLE "DailyHoroscope" (
  "sign"               varchar(16) NOT NULL,
  "day"                date NOT NULL,
  "text"               text NOT NULL CHECK (length("text") > 0),
  "utcCreatedDateTime" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("sign", "day")
);
