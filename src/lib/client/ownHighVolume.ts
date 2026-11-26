import { useEffect, useState } from 'react';
import { api } from '@/lib/client/api';
import { useRefreshTick } from '@/lib/client/refreshTick';
import type { HighVolumeDay } from '@/lib/highVolume';

type Latest = { symbol: string; day: string };

const NONE: Latest[] = [];

// Each of the reader's tickers that had a high-volume day, either way, in the
// last `days` calendar days, with its newest such day: one read tells which of
// the shorter spans it falls in too. Empty while loading or if the read fails.
export function useOwnHighVolume(own: string[], days: number): Latest[] {
  const symbols = [...own].sort().join(',');
  const request = `${days}|${symbols}`;
  const [state, setState] = useState<{ request: string; latest: Latest[] } | null>(null);
  const tick = useRefreshTick();
  useEffect(() => {
    if (!symbols) return;
    let stale = false;
    // Never more than one batch: the list is capped below the endpoint's limit.
    api
      .get<{ stocks: { symbol: string; days: HighVolumeDay[] }[] }>(`/api/trades/high-volume?days=${days}&symbols=${encodeURIComponent(symbols)}`)
      .then(({ stocks }) => {
        // Each stock's days come newest first.
        if (!stale) setState({ request, latest: stocks.map((s) => ({ symbol: s.symbol, day: s.days[0].day })) });
      })
      .catch(() => {});
    return () => {
      stale = true;
    };
  }, [symbols, days, request, tick]);
  return state?.request === request ? state.latest : NONE;
}
