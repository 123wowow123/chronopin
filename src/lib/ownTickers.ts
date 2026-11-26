// The tickers a reader adds to the trades pages: parsing what they type, and
// keeping theirs in view. Pure: the account keeps the list (OwnTicker, 0270).

import { normalizeSymbol } from './stocks';

export const MAX_OWN_TICKERS = 20;

// What was typed, one or several symbols apart by spaces or commas ("$" and
// lower case allowed): the symbols, and whether any part was not one.
export function parseTickerInput(text: string): { symbols: string[]; invalid: boolean } {
  const parts = text.split(/[\s,]+/).filter(Boolean);
  const symbols = parts.map(normalizeSymbol);
  return { symbols: [...new Set(symbols.filter((s) => s !== null))], invalid: symbols.includes(null) };
}

// A collapsed ranking of `size` entries that never leaves out one of the
// reader's tickers: those ranked below the cut take the last places, in rank
// order.
export function topWithOwn<T extends readonly [string, ...unknown[]]>(ranked: readonly T[], size: number, own: string[]): T[] {
  const below = ranked.slice(size).filter(([symbol]) => own.includes(symbol));
  if (!below.length) return ranked.slice(0, size);
  // The reader's own entries above the cut keep their places too.
  let room = Math.max(size - below.length - ranked.slice(0, size).filter(([symbol]) => own.includes(symbol)).length, 0);
  return [...ranked.slice(0, size).filter(([symbol]) => own.includes(symbol) || room-- > 0), ...below];
}
