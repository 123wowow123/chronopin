import Anchor from '@/components/ui/Anchor';
import Link from '@/components/ui/Link';
import { JsonLd } from '@/components/JsonLd';
import { siteName } from '@/lib/appConfig';
import { TimelineVideoProvider } from '@/lib/client/timelineVideo';
import { dayKeyIn, yearLabel } from '@/lib/format';
import { INTL_LOCALES } from '@/lib/i18n/config';
import type { Translator } from '@/lib/i18n/translate';
import { monthDayLabel, neighbourMonthDay, onThisDayPath } from '@/lib/onThisDay';
import type { TimelineVideoSetting } from '@/lib/timelineVideo';
import { topicJsonLd } from '@/lib/seo';
import type { OnThisDayPage } from '@/server/services/onThisDay';
import { PinSection } from './TopicView';

// One calendar day's page: what Chronopin has pinned on it in earlier years,
// the newest year first, under a sentence that says how much and since when.
export function OnThisDayView({ page, timeZone, video, t }: { page: OnThisDayPage; timeZone: string; video: TimelineVideoSetting; t: Translator }) {
  const now = new Date();
  const todayKey = dayKeyIn(now, timeZone);
  const date = monthDayLabel(page.monthDay, INTL_LOCALES[t.locale]);
  const path = onThisDayPath(page.monthDay);
  const previous = neighbourMonthDay(page.monthDay, -1);
  const next = neighbourMonthDay(page.monthDay, 1);
  const shown = page.years.flatMap((g) => g.pins);

  return (
    <main className="mx-auto max-w-7xl px-4 pt-6 pb-20 sm:px-6">
      <JsonLd
        data={topicJsonLd({ name: t('onThisDay.title', { date }), path, description: t('onThisDay.description', { date, site: siteName }), locale: t.locale, hub: { name: t('onThisDay.hub'), path: '/on-this-day' }, pins: shown })}
      />

      <nav aria-label="Breadcrumb" className="mb-4 text-xs text-subtle">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/" className="text-inherit hover:text-ink">
              {siteName}
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link href="/on-this-day" className="text-inherit hover:text-ink">
              {t('onThisDay.hub')}
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li aria-current="page" className="text-muted">
            {date}
          </li>
        </ol>
      </nav>

      <header className="mb-10 max-w-3xl">
        <h1 className="mb-3 text-3xl leading-tight font-semibold tracking-tight text-pretty">{t('onThisDay.title', { date })}</h1>
        {/* The answer first, in a sentence that can be quoted. */}
        <p className="text-base leading-relaxed text-ink">
          {page.total && page.firstYear !== null
            ? t('onThisDay.summary', { date, count: page.total, year: yearLabel(page.firstYear, t.locale) })
            : t('onThisDay.empty', { date })}
        </p>
        {page.headline ? (
          <p className="mt-3 text-sm leading-relaxed text-muted">
            {t('onThisDay.headline', { year: page.headline.year })}{' '}
            <Anchor href={page.headline.url} target="_blank" rel="noopener">
              {page.headline.text}
            </Anchor>{' '}
            <span className="text-subtle">(Wikipedia)</span>
          </p>
        ) : null}
        <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <Link href={onThisDayPath(previous)}>← {monthDayLabel(previous, INTL_LOCALES[t.locale])}</Link>
          <Link href={onThisDayPath(next)}>{monthDayLabel(next, INTL_LOCALES[t.locale])} →</Link>
        </p>
      </header>

      <TimelineVideoProvider setting={video}>
        {page.years.map((g) => (
          <PinSection key={g.year} id={`y${g.year}`} heading={yearLabel(g.year, t.locale)} pins={g.pins} timeZone={timeZone} now={now} todayKey={todayKey} />
        ))}
      </TimelineVideoProvider>
    </main>
  );
}
