// Prices in the reader's own currency. A pin's price is stored in the currency
// its source states; the page shows it converted to the currency of the page's
// language, and the pin's own page shows both. There is no live exchange-rate
// feed, so the rates are FIXED, rounded approximations (units of a currency per
// one US dollar, last reviewed 2026-10-19): they are for orientation ("about
// 1.5 billion dollars"), never for accounting, and every converted figure is
// marked "≈". Update the table when a rate has drifted noticeably.

import { money } from './format';
import type { Locale } from './i18n/config';

export const USD_RATES: Record<string, number> = {
  USD: 1, EUR: 0.92, GBP: 0.78, JPY: 150, CNY: 7.2, INR: 84, KRW: 1350, AUD: 1.5, CAD: 1.37, NZD: 1.65,
  HKD: 7.8, SGD: 1.34, SAR: 3.75, AED: 3.67, THB: 35, RUB: 90, BRL: 5.5, MYR: 4.4, IDR: 15800, VND: 25000,
  MXN: 18, SEK: 10.5, NOK: 10.7, DKK: 6.9, CHF: 0.88, TRY: 34, ILS: 3.7, TWD: 32, PHP: 57,
};

// The currency each page language reads prices in.
export const LOCALE_CURRENCY: Record<Locale, string> = {
  en: 'USD', es: 'EUR', fr: 'EUR', de: 'EUR', ja: 'JPY', zh: 'CNY', ko: 'KRW', hi: 'INR',
  ar: 'SAR', th: 'THB', it: 'EUR', ru: 'RUB', pt: 'BRL', ms: 'MYR', vi: 'VND', id: 'IDR',
};

// An amount in another currency, or null when either currency has no rate.
export function convertMoney(value: number, from: string | null | undefined, to: string): number | null {
  const source = USD_RATES[(from || 'USD').toUpperCase()];
  const target = USD_RATES[to.toUpperCase()];
  return source && target ? (value / source) * target : null;
}

// What a price shows on a card: the amount in the page language's currency
// ("≈¥4.2B"), or as stored when it is already that currency or cannot be
// converted.
export function localMoney(value: number, currency: string | null | undefined, locale: Locale): string {
  const own = (currency || 'USD').toUpperCase();
  const target = LOCALE_CURRENCY[locale] ?? 'USD';
  if (own === target) return money(value, currency);
  const converted = convertMoney(value, own, target);
  return converted == null ? money(value, currency) : `≈${money(converted, target)}`;
}

// The pin's own page: the stated amount, then its approximate equivalent when
// the page's currency differs ({ stated: "₹13B", local: "≈$155M" }).
export function bothMoney(value: number, currency: string | null | undefined, locale: Locale): { stated: string; local: string | null } {
  const stated = money(value, currency);
  const local = localMoney(value, currency, locale);
  return { stated, local: local === stated ? null : local };
}

// SQL for a pin's price in US dollars, for the cost: filter and its counts: a
// CASE over every known currency, NULL for one without a rate. Built from
// USD_RATES only, so nothing typed reaches the query.
export function usdPriceSql(price: string, currency: string): string {
  const arms = Object.entries(USD_RATES)
    .filter(([code]) => code !== 'USD')
    .map(([code, rate]) => `WHEN '${code}' THEN ${price}::numeric / ${rate}`);
  return `(CASE coalesce(${currency}, 'USD') WHEN 'USD' THEN ${price}::numeric ${arms.join(' ')} END)`;
}
