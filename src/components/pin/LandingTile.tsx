import Link from '@/components/ui/Link';
import { dateFormat, plainText } from '@/lib/format';
import { INTL_LOCALES, pinTextDir } from '@/lib/i18n/config';
import type { Translator } from '@/lib/i18n/translate';
import { pinPath } from '@/lib/seo';
import { pinDayKey } from '@/lib/timeline';
import type { PinJson } from '@/lib/types';
import { LandingMediaGallery } from './LandingMediaGallery';
import { ThreadAge } from './ThreadAge';

// A pin on a landing page, stripped to what makes someone click: the picture,
// when, what, and a line of why. Prices, badges, tickers and counters stay on
// the pin's own page.
export function LandingTile({ pin, timeZone, t, upcoming }: { pin: PinJson; timeZone: string; t: Translator; upcoming: boolean }) {
  const day = pinDayKey(pin, timeZone);
  const date = dateFormat(INTL_LOCALES[t.locale], { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${day}T00:00:00Z`));
  const blurb = plainText(pin.description, 140);
  return (
    <article dir={pinTextDir(pin)} className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-panel transition-shadow hover:no-underline hover:shadow-lg">
      <LandingMediaGallery name={pin.title} href={pinPath(pin)} media={pin.media} badge={pin.categories?.[0] ? <span className="pointer-events-none absolute start-3 top-3 rounded-full bg-black/55 px-2.5 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">{pin.categories[0]}</span> : null} />
      <Link href={pinPath(pin)} className="flex flex-1 flex-col gap-1.5 p-4 hover:no-underline">
        <span className="flex items-center justify-between gap-2 text-xs text-subtle">
          <time dateTime={pin.allDay ? day : pin.utcStartDateTime}>{date}</time>
          {upcoming ? <ThreadAge start={pin.utcStartDateTime} allDay={pin.allDay} /> : null}
        </span>
        <span className="line-clamp-2 text-[17px] leading-snug font-semibold text-ink">{pin.title}</span>
        {blurb ? <span className="line-clamp-2 text-sm text-muted">{blurb}</span> : null}
      </Link>
    </article>
  );
}
