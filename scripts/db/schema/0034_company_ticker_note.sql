-- What a company's own ticker says about it on a pin page, read after its
-- name: "Company: Sony (SONY), the Japanese electronics, games and
-- entertainment group behind PlayStation." Written by Claude alongside its
-- related and supplier tickers, or by hand (`stocks:sync --about`).
ALTER TABLE "Company" ADD COLUMN "tickerNote" varchar(300);
