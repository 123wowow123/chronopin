import type { ReactNode } from 'react';
import Anchor from '@/components/ui/Anchor';
import Link from '@/components/ui/Link';
import { JsonLd } from '@/components/JsonLd';
import { EarningsRow } from '@/components/person/EarningsRow';
import { OctagonChart } from '@/components/person/OctagonChart';
import { PinSection } from '@/components/topic/TopicView';
import { siteName } from '@/lib/appConfig';
import { TimelineVideoProvider } from '@/lib/client/timelineVideo';
import { dateFormat, dayKeyIn } from '@/lib/format';
import { INTL_LOCALES } from '@/lib/i18n/config';
import type { Translator } from '@/lib/i18n/translate';
import {
  ADVERSE_STATUSES,
  CHART_COLORS,
  CONTRIBUTION_KINDS,
  currentAge,
  earningYears,
  formatMoney,
  formatMoneyRange,
  IMPACT_CRITERIA,
  impactScore,
  isPolitical,
  lineWeight,
  misconductMeter,
  OPEN_STATUSES,
  personPath,
  safeUrl,
  SOCIETY_LEVELS,
  societyMeter,
  sortContributions,
  sortMatters,
  valueRange,
  type PersonContribution,
 collapseSparsePhases } from '@/lib/people';
import type { CompiledPerson } from '@/lib/personWiki';
import { personJsonLd } from '@/lib/seo';
import { term } from '@/lib/searchTerms';
import type { TimelineVideoSetting } from '@/lib/timelineVideo';
import type { PinJson } from '@/lib/types';
import { CommitteesSection } from '@/components/person/CommitteesSection';
import type { Seat } from '@/lib/conflicts';
import { TradesSection } from '@/components/person/TradesSection';
import type { TradeRow, TradeSummary } from '@/lib/trades';
import { CampaignSection } from '@/components/person/CampaignSection';
import type { CampaignCycle } from '@/lib/campaigns';
import { HoldingsSection } from '@/components/person/HoldingsSection';
import type { HoldingsSnapshot } from '@/lib/holdings';

const PILL = 'inline-flex items-center rounded-full bg-raised px-2.5 py-0.5 text-xs font-medium text-ink ring-1 ring-inset ring-line';
const TAG = 'inline-flex items-center rounded-md bg-raised px-1.5 py-0.5 text-[11px] font-medium text-muted';

// A person's page: who they are, what they earned each year as tiles under
// that, the phases of their life, the laws they passed and what else they are
// known for, their record, property and trips - every figure with the link it
// was read from, and nothing for what nobody has published.
export function PersonView({
  profile,
  pins,
  trades,
  tradeSummary,
  holdings = [],
  committees = [],
  campaigns,
  timeZone,
  video,
  t,
}: {
  profile: CompiledPerson;
  pins: PinJson[];
  trades: TradeRow[];
  tradeSummary?: TradeSummary;
  holdings?: HoldingsSnapshot[];
  committees?: Seat[];
  campaigns: CampaignCycle[];
  timeZone: string;
  video: TimelineVideoSetting;
  t: Translator;
}) {
  const now = new Date();
  const todayKey = dayKeyIn(now, timeZone);
  const intl = INTL_LOCALES[t.locale];
  const day = (iso: string) => dateFormat(intl, { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${iso}T00:00:00Z`));
  const age = currentAge(profile, now);
  const years = earningYears(profile.earnings);
  const contributions = sortContributions(profile.contributions);
  const matters = sortMatters(profile.matters);
  const meter = misconductMeter(profile.matters, profile.mattersCheckedDate);
  const society = societyMeter(profile.contributions);
  const path = personPath(profile.name);
  const description = t('person.description', { name: profile.name, site: siteName });
  const jobTitle = profile.office || t.dynamic(`person.roles.${profile.role}`, profile.role);
  const photo = safeUrl(profile.photoUrl);
  const hasRecord = years.length > 0 || contributions.length > 0 || profile.properties.length > 0 || profile.trips.length > 0;
  const lawsHeading = t(isPolitical(profile.role) ? 'person.laws' : 'person.work');
  // Everyone's radar is backed by the wiki. One with nothing documented that
  // maps to an axis shows the empty overview, and says so, rather than no chart.
  const phases = profile.phases.length
    ? collapseSparsePhases(profile.phases)
    : [{ origin: 'generated' as const, label: 'Overview', startYear: null, endYear: null, summary: null, axes: {} }];

  // The facts under the name, each a small card; the long ones span two columns.
  const facts: { label: string; value: string; sub?: string; source?: string | null; wide?: boolean }[] = [];
  if (profile.inOfficeSince) facts.push({ label: t('person.inOfficeSince'), value: day(profile.inOfficeSince) });
  if (profile.leftOfficeDate) facts.push({ label: t('person.leftOffice'), value: day(profile.leftOfficeDate) });
  if (profile.birthDate) facts.push({ label: t('person.born'), value: day(profile.birthDate) });
  if (profile.deathDate) facts.push({ label: t('person.died'), value: day(profile.deathDate) });
  if (profile.religion) facts.push({ label: t('person.religion'), value: profile.religion, source: profile.religionSourceUrl });
  if (profile.weightKg != null) {
    const lb = Math.round(profile.weightKg * 2.20462);
    facts.push({
      label: t('person.weight'),
      value: `${profile.weightKg} kg (${lb} lb)`,
      sub: profile.weightAsOf ? t('person.asOf', { date: day(profile.weightAsOf) }) : undefined,
      source: profile.weightSourceUrl,
    });
  }
  if (profile.politics) facts.push({ label: t('person.politics'), value: profile.politics, source: profile.politicsSourceUrl, wide: true });
  if (profile.health) {
    facts.push({
      label: t('person.health'),
      value: profile.health,
      sub: profile.healthAsOf ? t('person.asOf', { date: day(profile.healthAsOf) }) : undefined,
      source: profile.healthSourceUrl,
      wide: true,
    });
  }

  // Where the page jumps to, in the order it runs.
  const nav = [
    { id: 'phases', label: t('person.octagon.title') },
    years.length ? { id: 'earnings', label: t('person.earnings') } : null,
    { id: 'holdings', label: t('person.holdings.title') },
    trades.length ? { id: 'trades', label: t('person.trades.title') } : null,
    committees.length ? { id: 'committees', label: t('person.committees.title') } : null,
    campaigns.length ? { id: 'campaign', label: t('person.campaign.title') } : null,
    contributions.length ? { id: 'laws', label: lawsHeading } : null,
    meter ? { id: 'record', label: t('person.matters') } : null,
    profile.properties.length ? { id: 'property', label: t('person.properties') } : null,
    profile.trips.length ? { id: 'trips', label: t('person.trips') } : null,
    pins.length ? { id: 'pins', label: t('person.pins', { name: profile.name }) } : null,
    profile.references.length ? { id: 'sources', label: t('person.sources') } : null,
  ].filter((n): n is { id: string; label: string } => !!n);

  return (
    <main className="mx-auto max-w-7xl px-4 pt-6 pb-20 sm:px-6">
      <JsonLd
        data={personJsonLd({
          name: profile.name,
          path,
          description,
          locale: t.locale,
          person: {
            jobTitle: profile.office,
            party: profile.party,
            birthDate: profile.birthDate,
            deathDate: profile.deathDate,
            image: photo,
            sameAs: [profile.wikiUrl, profile.websiteUrl].filter((u): u is string => !!safeUrl(u)),
          },
        })}
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
            <Link href="/people" className="text-inherit hover:text-ink">
              {t('person.hub')}
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li aria-current="page" className="text-muted">
            {profile.name}
          </li>
        </ol>
      </nav>

      {/* The main pane: who they are and what is known about them. */}
      <section aria-labelledby="profile-heading" className="floating overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-accent/30 via-accent/10 to-transparent sm:h-24" aria-hidden />
        <div className="flex flex-col gap-5 px-5 pb-6 sm:flex-row sm:px-7">
          {photo ? (
            <figure className="-mt-14 shrink-0 sm:-mt-16">
              {/* eslint-disable-next-line @next/next/no-img-element -- portraits come from Wikimedia Commons */}
              <img
                src={photo}
                alt={profile.name}
                referrerPolicy="no-referrer"
                className="aspect-[3/4] w-32 rounded-2xl bg-raised object-cover shadow-lg ring-4 ring-panel sm:w-40"
              />
              {profile.photoCredit ? <figcaption className="mt-1.5 max-w-40 text-[10px] leading-snug text-subtle">{t('person.photoCredit', { credit: profile.photoCredit })}</figcaption> : null}
            </figure>
          ) : null}
          <div className="min-w-0 flex-1 sm:pt-4">
            <h1 id="profile-heading" className="text-3xl leading-tight font-semibold tracking-tight text-pretty sm:text-4xl">
              {profile.name}
            </h1>
            <p className="mt-1 text-base text-muted">
              {jobTitle}
              {profile.jurisdiction && !profile.office?.includes(profile.jurisdiction) ? ` · ${profile.jurisdiction}` : ''}
              <RefMark numbers={profile.basics} />
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {profile.party ? <span className={PILL}>{profile.party}</span> : null}
              {age != null ? <span className={PILL}>{t(profile.deathDate ? 'person.ageAtDeath' : 'person.ageValue', { age })}</span> : null}
            </div>
            {profile.description ? <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-ink/90">{profile.description}</p> : null}
            <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm">
              <Link href={`/search?q=${encodeURIComponent(term('tag', profile.name))}`} prefetch={false}>
                {t('person.moreInSearch', { name: profile.name })}
              </Link>
              {safeUrl(profile.wikiUrl) ? (
                <Anchor href={profile.wikiUrl!} target="_blank" rel="noopener">
                  Wikipedia
                </Anchor>
              ) : null}
              {safeUrl(profile.websiteUrl) ? (
                <Anchor href={profile.websiteUrl!} target="_blank" rel="noopener">
                  {t('person.website')}
                </Anchor>
              ) : null}
            </p>
          </div>
        </div>
        {facts.length ? (
          <dl className="grid border-t border-line sm:grid-cols-2 lg:grid-cols-3">
            {facts.map((f) => (
              <div key={f.label} className={`min-w-0 border-b border-line px-5 py-3.5 last:border-b-0 sm:px-7 ${f.wide ? 'sm:col-span-2 lg:col-span-3' : ''}`}>
                <dt className="text-[11px] font-medium tracking-wide text-subtle uppercase">{f.label}</dt>
                <dd className="mt-0.5 text-sm leading-relaxed text-ink">
                  <Collapsible text={f.value} t={t} />
                  {f.sub ? <span className="text-subtle"> · {f.sub}</span> : null}
                  <Ref url={f.source} refs={profile.refs} />
                </dd>
              </div>
            ))}
          </dl>
        ) : null}
      </section>

      {/* Jump to a section. */}
      {nav.length > 2 ? (
        <nav aria-label={t('person.jump')} className="mt-4 flex flex-wrap gap-2">
          {nav.map((n) => (
            <a key={n.id} href={`#${n.id}`} className="rounded-full bg-field px-3 py-1 text-xs font-medium text-muted ring-1 ring-line ring-inset hover:bg-raised hover:text-ink hover:no-underline">
              {n.label}
            </a>
          ))}
        </nav>
      ) : null}

      <div className="mt-12 flex flex-col gap-14">
        <Section id="phases" title={t('person.octagon.title')} count={phases.length} about={t('person.octagon.about', { name: profile.name })}>
          <OctagonChart phases={phases} refs={profile.refs} />
        </Section>

        {/* Earnings, a tile a year, directly under the main pane. */}
        {years.length ? (
          <section id="earnings" aria-labelledby="earnings-heading" className="scroll-mt-20">
            <EarningsRow
              count={years.length}
              heading={<SectionHeading id="earnings" title={t('person.earnings')} count={years.length} about={t('person.earningsAbout')} />}
            >
              {years.map((y) => (
                <li key={y.year} className="floating flex flex-col gap-1 px-4 py-4">
                  <span className="text-xs font-semibold tracking-wide text-subtle tabular-nums">{y.year}</span>
                  <span className="text-2xl font-semibold tracking-tight text-ink tabular-nums">
                    {y.exact ? formatMoney(intl, y.high, y.currency) : formatMoneyRange(intl, y.low, y.high, y.currency)}
                  </span>
                  <span className="text-[11px] text-subtle">{t('person.earningsTotal')}</span>
                  {/* What the year is made of, always shown: a stacked bar, one colour a line, and the lines under it. */}
                  <div
                    className="mt-2 flex h-3 w-full gap-px overflow-hidden rounded-full bg-raised ring-1 ring-line ring-inset"
                    role="img"
                    aria-label={y.lines
                      .map((l) => `${l.label || t.dynamic(`person.earningKinds.${l.kind}`, l.kind)}: ${l.amount != null ? formatMoney(intl, l.amount, l.currency) : formatMoneyRange(intl, l.amountLow!, l.amountHigh!, l.currency)}`)
                      .join('; ')}
                  >
                    {y.lines.map((line, i) => (
                      <span
                        key={`${line.kind}-${line.label}`}
                        title={`${line.label || t.dynamic(`person.earningKinds.${line.kind}`, line.kind)}`}
                        className="h-full min-w-[3px]"
                        style={{ flexGrow: Math.max(lineWeight(line), 1), flexBasis: 0, background: CHART_COLORS[i % CHART_COLORS.length] }}
                      />
                    ))}
                  </div>
                  <dl className="mt-2.5 flex flex-col gap-1.5 text-xs">
                    {y.lines.map((line, i) => (
                      <div key={`${line.kind}-${line.label}`} className="flex items-start gap-2">
                        <span className="mt-1 size-2 shrink-0 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} aria-hidden />
                        <dt className="min-w-0 flex-1 text-muted">
                          {line.label || t.dynamic(`person.earningKinds.${line.kind}`, line.kind)}
                          <Ref url={line.sourceUrl} refs={profile.refs} />
                        </dt>
                        <dd className="shrink-0 text-end text-ink tabular-nums">
                          {line.amount != null ? formatMoney(intl, line.amount, line.currency) : formatMoneyRange(intl, line.amountLow!, line.amountHigh!, line.currency)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  {!y.exact ? <p className="mt-1 text-[10px] leading-snug text-subtle">{t('person.earningsRangeNote')}</p> : null}
                </li>
              ))}
            </EarningsRow>
          </section>
        ) : null}

        <HoldingsSection portfolios={holdings} today={todayKey} t={t} />
        {trades.length ? <TradesSection personId={profile.id} name={profile.name} trades={trades} summary={tradeSummary} t={t} /> : null}

        {committees.length ? <CommitteesSection seats={committees} t={t} /> : null}

        {campaigns.length ? <CampaignSection campaigns={campaigns} name={profile.name} t={t} /> : null}

        {contributions.length ? (
          <Section id="laws" title={lawsHeading} count={contributions.length}>
            {society ? (
              <div className="floating mb-6 max-w-2xl px-4 py-4">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <span className="text-sm font-semibold text-ink">{t('person.society')}</span>
                  <span className="text-sm font-medium text-ink">{t.dynamic(`person.societyLevels.${society.level}`, society.level)}</span>
                </div>
                {/* -2 .. +2: the marker is the weighted mean, the band the lowest to the highest assessed contribution. */}
                <div className="relative mt-3 h-2 rounded-full bg-raised ring-1 ring-line ring-inset" role="img" aria-label={t.dynamic(`person.societyLevels.${society.level}`, society.level)}>
                  <span
                    className="absolute inset-y-0 rounded-full bg-ink/20"
                    style={{ left: `${((society.min + 2) / 4) * 100}%`, width: `${Math.max(2, ((society.max - society.min) / 4) * 100)}%` }}
                  />
                  <span className="absolute -top-1 h-4 w-1.5 -translate-x-1/2 rounded-full bg-ink" style={{ left: `${((society.value + 2) / 4) * 100}%` }} />
                </div>
                <div className="mt-1 flex justify-between text-[10px] text-subtle" aria-hidden>
                  <span>{t.dynamic(`person.societyLevels.${SOCIETY_LEVELS[0]}`, 'harmful')}</span>
                  <span>{t.dynamic(`person.societyLevels.${SOCIETY_LEVELS[4]}`, 'beneficial')}</span>
                </div>
                <p className="mt-2 text-[11px] leading-snug text-subtle">
                  {[
                    t('person.societyCoverage', { assessed: society.assessed, total: society.total }),
                    society.contested ? t('person.societyContested', { count: society.contested }) : null,
                    t('person.societyRange', { min: society.min.toFixed(1), max: society.max.toFixed(1) }),
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
                <p className="mt-1.5 text-[11px] leading-snug text-subtle">{t('person.societyAbout', { name: profile.name })}</p>
              </div>
            ) : null}
            <div className="grid gap-5 lg:grid-cols-2">
              {CONTRIBUTION_KINDS.map((kind) => {
                const list = contributions.filter((c) => c.kind === kind);
                if (!list.length) return null;
                return (
                  <div key={kind} className="floating px-5 py-4">
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
                      {t.dynamic(`person.contributionKinds.${kind}`, kind)}
                      <span className="rounded-full bg-raised px-2 py-0.5 text-[11px] font-medium text-muted tabular-nums">{list.length}</span>
                    </h3>
                    <ul className="flex flex-col">
                      {list.map((c) => (
                        <ContributionRow key={`${c.title}|${c.reference ?? ''}`} c={c} day={day} t={t} refs={profile.refs} />
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </Section>
        ) : null}

        {meter ? (
          <Section id="record" title={t('person.matters')} count={matters.length || undefined} about={`${t('person.mattersAbout', { date: day(meter.checked) })} ${t('person.meterAbout')}`}>
            {/* The tally, in words: the radar carries the misconduct axis itself. */}
            <p className="mb-4 flex flex-wrap items-center gap-2">
              {meter.findings ? <span className={`${TAG} bg-danger/10 text-danger ring-1 ring-danger/25 ring-inset`}>{t('person.meterFindings', { count: meter.findings })}</span> : null}
              {meter.open ? <span className={TAG}>{t('person.meterOpen', { count: meter.open })}</span> : null}
              {meter.resolved ? <span className={`${TAG} bg-success/10 text-success ring-1 ring-success/25 ring-inset`}>{t('person.meterResolved', { count: meter.resolved })}</span> : null}
              {!matters.length ? <span className="text-sm text-muted">{t('person.meterNone')}</span> : null}
            </p>
            {matters.length ? (
              <ol className="relative flex flex-col gap-4 border-s border-line ps-6">
                {matters.map((m) => {
                  const tone = ADVERSE_STATUSES.includes(m.status) ? 'adverse' : OPEN_STATUSES.includes(m.status) ? 'open' : 'resolved';
                  return (
                    <li key={`${m.title}|${m.authority ?? ''}`} className="relative">
                      <span className={`absolute -start-[1.9rem] top-4 size-3 rounded-full ${DOT[tone]}`} aria-hidden />
                      <div className="floating flex flex-col gap-1.5 px-4 py-3.5">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${BADGE[tone]}`}>{t.dynamic(`person.matterStatuses.${m.status}`, m.status)}</span>
                          <span className="text-xs text-subtle">{t.dynamic(`person.matterKinds.${m.kind}`, m.kind)}</span>
                        </span>
                        <span className="text-sm font-medium text-ink">
                          {m.title}
                          <Ref url={m.sourceUrl} refs={profile.refs} />
                        </span>
                        <span className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted">
                          {m.authority ? <span>{m.authority}</span> : null}
                          {m.filedDate ? <span>{t('person.matterFiled', { date: day(m.filedDate) })}</span> : null}
                          {m.resolvedDate ? <span>{t('person.matterDecided', { date: day(m.resolvedDate) })}</span> : null}
                        </span>
                        {m.penalty ? <span className="text-xs font-medium text-ink">{t('person.matterPenalty', { penalty: m.penalty })}</span> : null}
                        {m.summary ? <span className="text-xs leading-relaxed text-subtle">{m.summary}</span> : null}
                      </div>
                    </li>
                  );
                })}
              </ol>
            ) : null}
          </Section>
        ) : null}

        {profile.properties.length || profile.trips.length ? (
          <div className="grid gap-10 lg:grid-cols-2">
            {profile.properties.length ? (
              <Section id="property" title={t('person.properties')} count={profile.properties.length}>
                <ul className="flex flex-col gap-3">
                  {profile.properties.map((p) => {
                    const value = valueRange(p.valueLow, p.valueHigh);
                    return (
                      <li key={p.name} className="floating flex flex-col gap-1.5 px-4 py-3.5">
                        <span className="text-sm font-medium text-ink">
                          {p.name}
                          <Ref url={p.sourceUrl} refs={profile.refs} />
                        </span>
                        <span className="flex flex-wrap items-center gap-1.5">
                          <span className={TAG}>{t.dynamic(`person.propertyKinds.${p.kind}`, p.kind)}</span>
                          {p.location ? <span className="text-xs text-muted">{p.location}</span> : null}
                          {p.acquiredYear ? <span className="text-xs text-subtle">· {t('person.acquired', { year: String(p.acquiredYear) })}</span> : null}
                        </span>
                        {value ? (
                          <span className="text-sm font-semibold text-ink tabular-nums">
                            {t('person.valued', { value: formatMoneyRange(intl, value.low, value.high, p.currency) })}
                            {p.asOf ? <span className="text-xs font-normal text-subtle"> · {t('person.asOf', { date: day(p.asOf) })}</span> : null}
                          </span>
                        ) : null}
                        {p.note ? <span className="text-xs leading-relaxed text-subtle">{p.note}</span> : null}
                      </li>
                    );
                  })}
                </ul>
              </Section>
            ) : null}
            {profile.trips.length ? (
              <Section id="trips" title={t('person.trips')} count={profile.trips.length}>
                <ul className="flex flex-col gap-3">
                  {profile.trips.map((trip) => (
                    <li key={`${trip.destination}|${trip.startDate}`} className="floating flex flex-col gap-1.5 px-4 py-3.5">
                      <span className="text-sm font-medium text-ink">
                        {trip.destination}
                        <Ref url={trip.sourceUrl} refs={profile.refs} />
                      </span>
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span className={TAG}>{t.dynamic(`person.tripKinds.${trip.kind}`, trip.kind)}</span>
                        <span className="text-xs text-muted tabular-nums">
                          {day(trip.startDate)}
                          {trip.endDate && trip.endDate !== trip.startDate ? ` – ${day(trip.endDate)}` : ''}
                        </span>
                      </span>
                      {trip.note ? <span className="text-xs leading-relaxed text-subtle">{trip.note}</span> : null}
                    </li>
                  ))}
                </ul>
              </Section>
            ) : null}
          </div>
        ) : null}

        {pins.length ? (
          <div id="pins" className="scroll-mt-20">
            <TimelineVideoProvider setting={video}>
              <PinSection id="person-pins" heading={t('person.pins', { name: profile.name })} pins={pins} timeZone={timeZone} now={now} todayKey={todayKey} />
            </TimelineVideoProvider>
          </div>
        ) : null}

        {!hasRecord && !pins.length ? <p className="text-sm text-muted">{t('person.noPublicRecord', { name: profile.name })}</p> : null}

        {/* The references the wiki cites, numbered as its footnotes are. */}
        {profile.references.length ? (
          <Section
            id="sources"
            wide
            title={t('person.sources')}
            count={profile.references.length}
            about={
              <>
                {t('person.sourcesAbout', { name: profile.name })}{' '}
                <Anchor href={`/api/people/${profile.id}/wiki?path=page`} target="_blank" rel="noopener">
                  {t('person.viewWiki')}
                </Anchor>
              </>
            }
          >
            <ol className="grid gap-x-8 gap-y-3 text-sm [grid-template-columns:repeat(auto-fill,minmax(15rem,1fr))]">
              {profile.references.map((r) => (
                <li key={r.ref} id={`source-${r.ref}`} className="flex scroll-mt-20 gap-2.5">
                  <span className="mt-0.5 w-8 shrink-0 text-end text-xs text-subtle tabular-nums">[{r.ref}]</span>
                  <span className="min-w-0">
                    <Anchor href={r.url} target="_blank" rel="noopener noreferrer" className="break-words text-link hover:underline">
                      {r.title ?? r.host}
                    </Anchor>
                    <span className="block text-xs text-subtle">
                      {r.title ? r.host : ''}
                      {r.recorded ? `${r.title ? ' · ' : ''}${t('person.recorded', { date: day(r.recorded) })}` : ''}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </Section>
        ) : null}
      </div>

      <p className="mt-14 border-t border-line pt-5 text-xs leading-relaxed text-subtle">{t('person.disclosureNote')}</p>
    </main>
  );
}

// The dot on a matter's timeline, and its status badge, by where it stands:
// a finding against the person, a matter still open, or one resolved in
// their favour.
const DOT = { adverse: 'bg-danger', open: 'bg-subtle', resolved: 'bg-success' } as const;
const BADGE = {
  adverse: 'bg-danger/10 text-danger ring-danger/25',
  open: 'bg-raised text-ink ring-line',
  resolved: 'bg-success/10 text-success ring-success/25',
} as const;

// A section: its heading with a count, a line on what it is, and the content.
function SectionHeading({ id, title, count, about, wide }: { id: string; title: string; count?: number; about?: ReactNode; wide?: boolean }) {
  return (
    <div className="mb-5 border-s-4 border-accent ps-4">
      <h2 id={`${id}-heading`} className="flex items-center gap-2.5 text-2xl font-semibold tracking-tight">
        {title}
        {count != null ? <span className="rounded-full bg-raised px-2.5 py-0.5 text-xs font-medium text-muted tabular-nums">{count}</span> : null}
      </h2>
      {about ? <p className={`mt-1.5 text-xs leading-relaxed text-subtle ${wide ? '' : 'max-w-3xl'}`}>{about}</p> : null}
    </div>
  );
}

function Section({ id, title, count, about, wide, children }: { id: string; title: string; count?: number; about?: ReactNode; wide?: boolean; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="scroll-mt-20">
      <SectionHeading id={id} title={title} count={count} about={about} wide={wide} />
      {children}
    </section>
  );
}

// A long fact is shown in part, with a control to open the rest.
function Collapsible({ text, t }: { text: string; t: Translator }) {
  if (text.length <= 200) return <>{text}</>;
  const cut = text.lastIndexOf(' ', 180);
  return (
    <details className="group">
      <summary className="cursor-pointer list-none group-open:hidden [&::-webkit-details-marker]:hidden">
        {text.slice(0, cut > 100 ? cut : 180)}… <span className="text-link">{t('person.more')}</span>
      </summary>
      <span>{text}</span>
    </details>
  );
}

// A footnote marker: the number the wiki cites the fact's source under, linking
// to that reference in the list at the foot of the page.
function Ref({ url, refs }: { url: string | null | undefined; refs: Record<string, number> }) {
  const n = url ? refs[url] : undefined;
  return n ? <RefMark numbers={[n]} /> : null;
}

function RefMark({ numbers }: { numbers: number[] }) {
  if (!numbers.length) return null;
  return (
    <sup className="ms-0.5 text-[10px] font-medium">
      {numbers.map((n, i) => (
        <a key={n} href={`#source-${n}`} className="text-link hover:underline">
          {i ? ',' : ''}[{n}]
        </a>
      ))}
    </sup>
  );
}

function ContributionRow({ c, day, t, refs }: { c: PersonContribution; day: (iso: string) => string; t: Translator; refs: Record<string, number> }) {
  return (
    <li className="flex flex-col gap-1.5 border-t border-line py-3 first:border-t-0 first:pt-0 last:pb-0">
      <span className="text-sm font-medium text-ink">
        {c.title}
        <Ref url={c.sourceUrl} refs={refs} />
      </span>
      {c.reference || c.role || c.date ? (
        <span className="flex flex-wrap items-center gap-1.5">
          {c.reference ? <span className={`${TAG} font-mono`}>{c.reference}</span> : null}
          {c.role ? <span className={TAG}>{t.dynamic(`person.contributionRoles.${c.role}`, c.role)}</span> : null}
          {c.date ? <span className="text-xs text-muted tabular-nums">{day(c.date)}</span> : null}
        </span>
      ) : null}
      {c.summary ? <span className="text-xs leading-relaxed text-subtle">{c.summary}</span> : null}
      <Impact c={c} t={t} refs={refs} />
    </li>
  );
}

// One contribution's assessed impact: the mean of the criteria that count, how
// sure the evidence is, whether credible sources disagree, and each criterion's
// score with the finding and its evidence in a fold-out.
function Impact({ c, t, refs }: { c: PersonContribution; t: Translator; refs: Record<string, number> }) {
  const score = impactScore(c.impact);
  if (!c.impact || score == null) return null;
  const sign = (n: number) => `${n > 0 ? '+' : ''}${n.toFixed(1)}`;
  const tone = score > 0.25 ? 'text-success' : score < -0.25 ? 'text-danger' : 'text-muted';
  return (
    <details className="group mt-0.5 text-xs">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 text-link hover:underline [&::-webkit-details-marker]:hidden">
        <span className={`font-semibold tabular-nums ${tone}`}>{sign(score)}</span>
        <span>
          {t('person.impact')} · {t.dynamic(`person.impactConfidence.${c.impact.confidence}`, c.impact.confidence)}
          {c.impact.contested ? ` · ${t('person.impactContested')}` : ''}
        </span>
      </summary>
      <dl className="mt-2 grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 rounded-lg bg-field px-3 py-2">
        {IMPACT_CRITERIA.filter((k) => typeof c.impact!.scores[k] === 'number').map((k) => (
          <div key={k} className="contents">
            <dt className="text-subtle">{t.dynamic(`person.impactCriteria.${k}`, k)}</dt>
            <dd className="text-end text-ink tabular-nums">{sign(c.impact!.scores[k]!)}</dd>
          </div>
        ))}
      </dl>
      {c.impact.basis ? <p className="mt-1.5 leading-relaxed text-subtle">{c.impact.basis}</p> : null}
      <Ref url={c.impact.evidenceUrl} refs={refs} />
    </details>
  );
}
