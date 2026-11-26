-- The tickers a signed-in reader added to the trades pages ("Add my ticker"),
-- and the alerts about them: the news job (06:00 and 18:00) reads each one's
-- daily prices and tells its readers of a high-volume up or down day, in the
-- bell and by Web Push.

CREATE TABLE "OwnTicker" (
  "userId"             integer NOT NULL REFERENCES "User" ("id") ON DELETE CASCADE,
  -- Upper-case symbol, as normalizeSymbol (src/lib/stocks.ts) writes it.
  "symbol"             varchar(10) NOT NULL,
  -- No alert is sent about a session before this day.
  "utcCreatedDateTime" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("userId", "symbol")
);

-- A 'ticker' notification carries what happened: { symbol, day, change, multiple }.
ALTER TABLE "Notification" ADD COLUMN "ticker" jsonb;
-- One per reader, stock and session, however many runs see it.
CREATE UNIQUE INDEX "UX_Notification_ticker" ON "Notification" ("userId", ("ticker" ->> 'symbol'), ("ticker" ->> 'day')) WHERE "type" = 'ticker';
