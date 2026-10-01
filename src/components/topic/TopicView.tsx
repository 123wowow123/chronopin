import Link from '@/components/ui/Link';
import { JsonLd } from '@/components/JsonLd';
import { CardGrid } from '@/components/pin/CardGrid';
import { PinCard } from '@/components/pin/PinCard';
import { siteName } from '@/lib/appConfig';
import { TimelineVideoProvider } from '@/lib/client/timelineVideo';
import { dateFormat, dayKeyIn } from '@/lib/format';
import { INTL_LOCALES, pinTextDir } from '@/lib/i18n/config';
import { tagLabel } from '@/lib/i18n/labels';
import type { Translator } from '@/lib/i18n/translate';
import { toCardPins } from '@/lib/sanitize';
import { term } from '@/lib/searchTerms';
import { pinPath, topicJsonLd } from '@/lib/seo';
import { pinDayKey, pinTense } from '@/lib/timeline';
import type { TimelineVideoSetting } from '@/lib/timelineVideo';
import { companyPath, tagPath } from '@/lib/topics';
import type { PinJson } from '@/lib/types';
import type { CompanyTopicPage, TopicPage } from '@/server/services/topics';

const CHIP = 'inline-flex items-center gap-1 rounded-full bg-field px-2.5 py-1 text-xs font-medium text-muted ring-1 ring-line ring-inset hover:bg-raised hover:text-ink hover:no-underline';

// A tag's or a company's page: what it is, how many dates it has coming and
// the next one, said in a sentence an answer engine can quote; then the pins
// themselves, upcoming soonest first and the recent past; then its
// neighbours, each a page of its own.
export function TopicView({
  page,
  kind,
  path,
  label,
  description,
  timeZone,
  video,
  t,
}: {
  page: (TopicPage & { kind: string }) | CompanyTopicPage;
  kind: 'tag' | 'company';
  path: string;
  // The name as the page's language writes it (a category's translation).
  label: string;
  description: string;
  timeZone: string;
  video: TimelineVideoSetting;
  t: Translator;
}) {
  const company = 'company' in page ? page.company : undefined;
  const hub = kind === 'tag' ? { name: t('topic.tags'), path: '/tags' } : { name: t('topic.companies'), path: '/companies' };
  const now = new Date();
  const todayKey = dayKeyIn(now, timeZone);
  const next = page.upcoming[0];
  const latest = page.past[0];

  return (
    <main className="mx-auto max-w-7xl px-4 pt-6 pb-20 sm:px-6">
      <JsonLd data={topicJsonLd({ name: label, path, description, locale: t.locale, hub, company, pins: page.upcoming })} />

      <nav aria-label="Breadcrumb" className="mb-4 text-xs text-subtle">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/" className="text-inherit hover:text-ink">
              {siteName}
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link href={hub.path} className="text-inherit hover:text-ink">
              {hub.name}
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li aria-current="page" className="text-muted">
            {label}
          </li>
        </ol>
      </nav>

      <header className="mb-10 max-w-3xl">
        <h1 className="mb-3 flex items-center gap-3 text-3xl leading-tight font-semibold tracking-tight text-pretty">
          {company?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- favicons from arbitrary hosts
            <img src={company.logoUrl} alt="" referrerPolicy="no-referrer" className="size-8 min-w-0 rounded-md" />
          ) : null}
          {t(kind === 'tag' ? 'topic.tagTitle' : 'topic.companyTitle', { name: label })}
        </h1>
        {/* The answer first: the next date, then how many there are. */}
        <p className="text-sm text-muted tabular-nums">{t('topic.counts', { upcoming: page.upcomingCount, total: page.total })}</p>
        <p className="mt-1 text-base leading-relaxed text-ink">
          {next ? (
            t.rich('topic.next', { title: () => <PinLink pin={next} />, date: () => <PinDate pin={next} timeZone={timeZone} t={t} /> })
          ) : latest ? (
            t.rich('topic.latest', { title: () => <PinLink pin={latest} />, date: () => <PinDate pin={latest} timeZone={timeZone} t={t} /> })
          ) : null}
        </p>
        {company?.description ? <p className="mt-3 text-[15px] leading-relaxed text-ink/90">{company.description}</p> : null}
        <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <Link href={`/search?q=${encodeURIComponent(term(kind, page.name))}`} prefetch={false}>
            {t('topic.moreInSearch', { name: label })}
          </Link>
          {company?.wikiUrl ? (
            <a href={company.wikiUrl} target="_blank" rel="noopener">
              Wikipedia
            </a>
          ) : null}
          {company?.websiteUrl ? (
            <a href={company.websiteUrl} target="_blank" rel="noopener">
              {t('topic.website')}
            </a>
          ) : null}
        </p>
      </header>

      <TimelineVideoProvider setting={video}>
        <PinSection id="upcoming" heading={t('topic.upcoming')} pins={page.upcoming} timeZone={timeZone} now={now} todayKey={todayKey} />
        <PinSection id="recent" heading={t('topic.past')} pins={page.past} timeZone={timeZone} now={now} todayKey={todayKey} />
      </TimelineVideoProvider>

      {page.relatedTags.length || page.relatedCompanies.length ? (
        <div className="mt-16 grid gap-8 border-t border-line pt-10 md:grid-cols-2">
          {page.relatedTags.length ? (
            <TopicLinks heading={t('topic.relatedTags')} links={page.relatedTags.map((tag) => ({ href: tagPath(tag.name), label: tagLabel(t, tag), pins: tag.pins }))} />
          ) : null}
          {page.relatedCompanies.length ? (
            <TopicLinks heading={t('topic.relatedCompanies')} links={page.relatedCompanies.map((c) => ({ href: companyPath(c.name), label: c.name, pins: c.pins }))} />
          ) : null}
        </div>
      ) : null}
    </main>
  );
}

function PinLink({ pin }: { pin: PinJson }) {
  return (
    <Link href={pinPath(pin)} dir={pinTextDir(pin)} className="font-medium">
      {pin.title}
    </Link>
  );
}

// The pin's day in the viewer's zone (UTC for a crawler; an all-day pin's
// day is the same everywhere), with its month in words: a sentence quoted
// elsewhere must not leave 11/05 to be read as 5 November or 11 May.
function PinDate({ pin, timeZone, t }: { pin: PinJson; timeZone: string; t: Translator }) {
  const day = pinDayKey(pin, timeZone);
  return <time dateTime={pin.allDay ? day : pin.utcStartDateTime}>{dateFormat(INTL_LOCALES[t.locale], { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${day}T00:00:00Z`))}</time>;
}

function PinSection({ id, heading, pins, timeZone, now, todayKey }: { id: string; heading: string; pins: PinJson[]; timeZone: string; now: Date; todayKey: string }) {
  if (!pins.length) return null;
  return (
    <section aria-labelledby={`${id}-heading`} className="mt-10 first:mt-0">
      <h2 id={`${id}-heading`} className="mb-4 text-xl font-semibold tracking-tight">
        {heading}
      </h2>
      <CardGrid>
        {toCardPins(pins).map((p) => (
          <li key={p.id}>
            <PinCard pin={p} serverTimeZone={timeZone} tense={pinTense(p, now, todayKey)} todayKey={todayKey} />
          </li>
        ))}
      </CardGrid>
    </section>
  );
}

export function TopicLinks({ heading, links }: { heading: string; links: { href: string; label: string; pins: number }[] }) {
  return (
    <section>
      <h2 className="mb-3 text-base font-semibold">{heading}</h2>
      <ul className="flex flex-wrap gap-1.5">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className={CHIP}>
              {link.label}
              <span className="text-subtle tabular-nums">{link.pins}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
