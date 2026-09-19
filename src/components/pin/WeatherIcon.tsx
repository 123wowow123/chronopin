'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { formatWeather, loadWeather, usesImperial } from '@/lib/weather';
import { useT } from '@/lib/client/i18n';

// A small weather icon and high temperature on a card. Waits until the card is
// near the viewport: the timeline holds hundreds of cards and each lookup is
// at least one Open-Meteo call on the server.
export function WeatherIcon({ pinId, hasPlace }: { pinId: number; hasPlace: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [weather, setWeather] = useState<ReturnType<typeof formatWeather> | null>(null);
  const t = useT();

  useEffect(() => {
    const el = ref.current;
    if (!hasPlace || !el) return;
    let cancelled = false;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          observer.disconnect();
          loadWeather(pinId).then((w) => {
            if (!cancelled && w) setWeather(formatWeather(w, usesImperial(), t));
          });
        }
      },
      { rootMargin: '300px' },
    );
    observer.observe(el);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [pinId, hasPlace, t]);

  if (!hasPlace) return null;
  // Until the weather loads the span is empty but still watched, so it sits out
  // of the flex row (absolute) rather than adding a second gap between its neighbours.
  return (
    <span ref={ref} className="inline-flex items-center gap-1 text-xs text-muted empty:absolute" title={weather?.summary}>
      {weather ? (
        <>
          <Icon name={weather.icon} className={`size-3.5 ${weather.kind === 'typical' ? 'text-subtle' : 'text-warning'}`} />
          {weather.high ? <span>{weather.high}</span> : null}
        </>
      ) : null}
    </span>
  );
}
