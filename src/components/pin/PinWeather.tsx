'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { formatWeather, loadWeather, usesImperial } from '@/lib/weather';
import { useT } from '@/lib/client/i18n';

// The weather strip under the map: forecast, recorded or typical weather at
// the pin's place on its date. Nothing when there is none.
export function PinWeather({ pinId }: { pinId: number }) {
  const [weather, setWeather] = useState<ReturnType<typeof formatWeather> | null>(null);
  const t = useT();

  useEffect(() => {
    let cancelled = false;
    loadWeather(pinId).then((w) => {
      if (!cancelled && w) setWeather(formatWeather(w, usesImperial(), t));
    });
    return () => {
      cancelled = true;
    };
  }, [pinId, t]);

  if (!weather) return null;
  return (
    <div className={`mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-l-4 border-line bg-panel px-3 py-2 text-sm ${weather.kind === 'typical' ? 'border-l-subtle' : 'border-l-amber-400'}`}>
      <Icon name={weather.icon} className="size-5 text-warning" />
      <div className="flex items-baseline gap-2">
        <span className="text-xs font-bold tracking-wider text-warning uppercase">{weather.heading}</span>
        {weather.label ? <span className="text-ink">{weather.label}</span> : null}
      </div>
      <div className="ml-auto flex flex-wrap items-center gap-x-3 text-ink">
        <span title={t('weather.highLow', { unit: weather.unit })}>
          <span className="font-semibold">{weather.high}</span> <span className="text-subtle">{weather.low}</span>
        </span>
        {weather.precipitation ? (
          <span className="inline-flex items-center gap-1">
            <Icon name="umbrella" className="size-3.5" />
            {weather.precipitation}
          </span>
        ) : null}
        {weather.wind ? <span>{t('weather.wind', { speed: weather.wind })}</span> : null}
      </div>
    </div>
  );
}
