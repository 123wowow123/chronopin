import 'server-only';
import { ratioToHigh } from '@/lib/holdingsMap';
import { fetchCloses, identifyCached } from './stocks';
import log from './util/log';

// Last close over the 52-week high for each symbol Nasdaq lists; a symbol it
// does not know (an OTC line, a delisted name) or a failed read is null.
export async function loadRatios(symbols: string[]): Promise<Map<string, number | null>> {
  const out = new Map<string, number | null>();
  await Promise.all([...new Set(symbols)].map(async symbol => {
    try {
      const found = await identifyCached(symbol);
      out.set(symbol, found ? ratioToHigh(await fetchCloses(symbol, found.assetClass)) : null);
    } catch (e) {
      log.warn(`holdings map: ${symbol}: ${(e as Error).message}`);
      out.set(symbol, null);
    }
  }));
  return out;
}
