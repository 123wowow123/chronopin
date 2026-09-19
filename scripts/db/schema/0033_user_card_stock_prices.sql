-- Whether pin cards show the company's stock price (and its move since the
-- start date) in the company pill. On unless the user turns it off on their
-- profile; the pin page always lists its tickers.
ALTER TABLE "User" ADD COLUMN "showCardStockPrices" boolean NOT NULL DEFAULT true;
