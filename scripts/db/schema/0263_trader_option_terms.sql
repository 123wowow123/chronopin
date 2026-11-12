-- Option terms on a trader position: the strike price and the expiration date
-- of a call or put, shown on the trade card. Null for stocks and shorts, and
-- for an option whose post does not state them.
ALTER TABLE "TraderPosition"
  ADD COLUMN "strikePrice" numeric(14, 4) CHECK ("strikePrice" IS NULL OR "strikePrice" > 0),
  ADD COLUMN "expirationDate" date;
