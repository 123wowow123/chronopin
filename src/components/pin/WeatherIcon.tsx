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
  // Undefined while loading, null when there is none.
  const [weather, setWeather] = useState<ReturnType<typeof formatWeather> | null>();
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
            if (!cancelled) setWeather(w ? formatWeather(w, usesImperial(), t) : null);
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

  if (!hasPlace || weather === null) return null;
  // Until the weather loads the span is empty but still watched, and holds
  // about an icon and "86°" of room: arriving in a row that was already full,
  // the weather would wrap the pills after it and push the rest of the card
  // down. It only fails to arrive when the lookup errors.
  if (!weather) return <span ref={ref} aria-hidden className="h-4 w-9" />;
  return (
    <span ref={ref} className="inline-flex items-center gap-1 text-xs text-muted" title={weather.summary}>
      <Icon name={weather.icon} className={`size-3.5 ${weather.kind === 'typical' ? 'text-subtle' : 'text-warning'}`} />
      {weather.high ? <span>{weather.high}</span> : null}
    </span>
  );
}
