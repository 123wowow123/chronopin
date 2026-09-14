'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { formatWeather, loadWeather, usesImperial } from '@/lib/weather';

// The weather strip under the map: forecast, recorded or typical weather at
// the pin's place on its date. Nothing when there is none.
export function PinWeather({ pinId }: { pinId: number }) {
  const [weather, setWeather] = useState<ReturnType<typeof formatWeather> | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadWeather(pinId).then((w) => {
      if (!cancelled && w) setWeather(formatWeather(w, usesImperial()));
    });
    return () => {
      cancelled = true;
    };
  }, [pinId]);

  if (!weather) return null;
  return (
    <div className={`mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 rounded border-l-4 bg-raised/60 px-3 py-2 text-sm ${weather.kind === 'typical' ? 'border-subtle' : 'border-amber-400'}`}>
      <Icon name={weather.icon} className="size-5 text-amber-400" />
      <div className="flex items-baseline gap-2">
        <span className="text-xs font-bold tracking-wider text-amber-400 uppercase">{weather.heading}</span>
        {weather.label ? <span className="text-ink">{weather.label}</span> : null}
      </div>
      <div className="ml-auto flex flex-wrap items-center gap-x-3 text-ink">
        <span title={`High / low, °${weather.unit}`}>
          <span className="font-semibold">{weather.high}</span> <span className="text-subtle">{weather.low}</span>
        </span>
        {weather.precipitation ? (
          <span className="inline-flex items-center gap-1">
            <Icon name="umbrella" className="size-3.5" />
            {weather.precipitation}
          </span>
        ) : null}
        {weather.wind ? <span>Wind {weather.wind}</span> : null}
        <a href="https://open-meteo.com/" target="_blank" rel="noopener" className="text-xs text-subtle">
          Open-Meteo
        </a>
      </div>
    </div>
  );
}
