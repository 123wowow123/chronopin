// Money and dates beside a stock price or a market's odds, per language.
// Built once per language: every card with a ticker reads them.

import { INTL_LOCALES, type Locale } from './config';

type StockFormats = { usd: Intl.NumberFormat; dayOnly: Intl.DateTimeFormat; dayShort: Intl.DateTimeFormat };

const cache = new Map<Locale, StockFormats>();

export function stockFormats(locale: Locale): StockFormats {
  let formats = cache.get(locale);
  if (!formats) {
    const tag = INTL_LOCALES[locale];
    formats = {
      usd: new Intl.NumberFormat(tag, { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      dayOnly: new Intl.DateTimeFormat(tag, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }),
      dayShort: new Intl.DateTimeFormat(tag, { month: 'short', day: 'numeric', timeZone: 'UTC' }),
    };
    cache.set(locale, formats);
  }
  return formats;
}
