import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { SeatBar } from '@/components/election/SeatBar';
import { LandingMark } from '@/components/ui/LandingMark';
import Link from '@/components/ui/Link';
import styles from '@/components/restaurants/RestaurantGuide.module.css';
import { JsonLd } from '@/components/JsonLd';
import { siteName } from '@/lib/appConfig';
import { electionPath, PARTY_TONE, type ElectionParty, type ElectionYear } from '@/lib/elections';
import { alternates, getT } from '@/lib/i18n/server';
import type { Translator } from '@/lib/i18n/translate';
import { localizePath } from '@/lib/i18n/config';
import { absoluteUrl } from '@/lib/seo';
import { electionFor } from '@/server/services/elections';
import { siteCardImages } from '@/server/services/shareCard';

type Props = PageProps<'/[lang]/election/[year]'>;

async function yearOf(params: Props['params']) {
  const { year } = await params;
  return /^\d{4}$/.test(year) ? electionFor(Number(year)) : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [election, t] = await Promise.all([yearOf(params), getT()]);
  if (!election) return { robots: { index: false } };
  const title = t('election.title', { year: String(election.year) });
  const description = t('election.description', { year: String(election.year), site: siteName });
  const [images, links] = await Promise.all([siteCardImages(), alternates(electionPath(election.year))]);
  return {
    title,
    description,
    alternates: links,
    openGraph: { type: 'website', siteName, url: links.canonical, title: `${title} · ${siteName}`, description, images },
    twitter: { card: 'summary_large_image', title: `${title} · ${siteName}`, description, images: images.map((i) => i.url) },
  };
}

export default function ElectionPage({ params }: Props) {
  return (
    <Suspense fallback={<div className="mx-auto h-[70vh] max-w-7xl animate-pulse rounded-xl bg-panel" aria-busy="true" />}>
      <ElectionContent params={params} />
    </Suspense>
  );
}

const PARTY_KEY = { D: 'election.democrats', R: 'election.republicans', I: 'election.independents' } as const;
const TEXT_TONE: Record<ElectionParty, string> = { D: 'text-blue-600', R: 'text-red-600', I: 'text-muted' };
const card = 'rounded-lg border border-[var(--rule)] bg-[var(--paper-raised)] p-4';

function Chamber({ t, name, d, r, total, majority, winner, uncalled, lines, updated }: { t: Translator; name: string; d: number; r: number; total: number; majority: number; winner: ElectionParty | null; uncalled: number; lines: string[]; updated: string }) {
  return (
    <div className={`${card} flex flex-col gap-2`}>
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-xl font-semibold">{name}</h2>
        {winner ? <span className="text-sm text-[var(--soft)]">{t('election.projected', { party: t(PARTY_KEY[winner]) })}</span> : null}
      </div>
      <SeatBar democrats={d} republicans={r} total={total} majority={majority} label={`${name}: ${t('election.democrats')} ${d}, ${t('election.republicans')} ${r}`} className="h-4" />
      <div className="flex items-baseline justify-between text-lg font-semibold tabular-nums">
        <span className={TEXT_TONE.D}>{t('election.democrats')} {d}</span>
        <span className="text-xs font-normal text-[var(--soft)]">{uncalled ? t('election.uncalledCount', { count: uncalled }) : t('election.majorityNeeded', { count: majority })}</span>
        <span className={TEXT_TONE.R}>{t('election.republicans')} {r}</span>
      </div>
      {lines.map((l) => <p key={l} className="text-sm text-[var(--soft)]">{l}</p>)}
      <p className="text-xs text-[var(--soft)]">{t('election.source', { time: updated })}</p>
    </div>
  );
}

function jsonLd(e: ElectionYear, title: string, description: string, t: Translator) {
  const url = absoluteUrl(localizePath(electionPath(e.year), t.locale));
  return [
    { '@context': 'https://schema.org', '@type': 'CollectionPage', url, name: title, description, isBasedOn: [e.source.senateUrl, e.source.houseUrl] },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: siteName, item: absoluteUrl(localizePath('/', t.locale)) },
        { '@type': 'ListItem', position: 2, name: title, item: url },
      ],
    },
  ];
}

async function ElectionContent({ params }: Pick<Props, 'params'>) {
  const [e, t] = await Promise.all([yearOf(params), getT()]);
  if (!e) notFound();
  const title = t('election.title', { year: String(e.year) });
  const description = t('election.description', { year: String(e.year), site: siteName });
  const houseUncalled = e.house.states.reduce((n, s) => n + s.uncalled, 0);
  const senateUncalled = e.senate.races.filter((r) => !r.winner).length;
  const senateFlips = e.senate.races.filter((r) => r.flip).length;
  const houseLines = [
    e.house.democraticFlips != null ? t('election.democratsFlipped', { count: e.house.democraticFlips }) : '',
    e.house.republicanFlips != null ? t('election.republicansFlipped', { count: e.house.republicanFlips }) : '',
    t('election.estimate', { d: e.house.estimate.democrats, r: e.house.estimate.republicans }),
  ].filter(Boolean);
  const th = 'px-2 py-1.5 text-start text-xs font-semibold text-[var(--soft)]';
  const td = 'px-2 py-1.5 text-sm tabular-nums';
  return (
    <main className={`${styles.guide} max-sm:px-3!`} data-landing>
      <LandingMark />
      {jsonLd(e, title, description, t).map((d, i) => <JsonLd key={i} data={d} />)}
      <div className={styles.container}>
        <div className={styles.guideNav}>
          <Link href={electionPath(e.year)} className={styles.wordmark}><span aria-hidden="true">✳</span> {t('election.wordmark')}</Link>
          <span className="flex gap-4 text-sm">
            <Link href={`/pin/${e.pins.hub}`} className="underline underline-offset-2">{t('election.thread')}</Link>
            {e.pins.senate ? <Link href={`/pin/${e.pins.senate}`} className="underline underline-offset-2">{t('election.senate')}</Link> : null}
          </span>
        </div>
        <header className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>{t('election.eyebrow')}</p>
            <h1>{title}</h1>
            <p className={styles.lead}>{description}</p>
          </div>
        </header>

        <section className={styles.section} aria-label={title}>
          <div className="grid gap-4 md:grid-cols-2">
            <Chamber t={t} name={t('election.senate')} d={e.senate.democrats} r={e.senate.republicans} total={100} majority={e.senate.majority} winner={e.senate.projectedWinner} uncalled={senateUncalled} lines={[t('election.democratsFlipped', { count: senateFlips })]} updated={e.updated.senate} />
            <Chamber t={t} name={t('election.house')} d={e.house.democrats} r={e.house.republicans} total={435} majority={e.house.majority} winner={e.house.projectedWinner} uncalled={houseUncalled} lines={houseLines} updated={e.updated.house} />
          </div>
        </section>

        <section className={styles.section} aria-labelledby="senate-races">
          <h2 id="senate-races" className="mb-3 text-2xl font-semibold">{t('election.senateRaces')}</h2>
          <div className={`${card} overflow-x-auto p-0`}>
            <table className="w-full min-w-[34rem] border-collapse">
              <thead>
                <tr className="border-b border-[var(--rule)]">
                  <th className={th}>{t('election.state')}</th>
                  <th className={th}>{t('election.winner')}</th>
                  <th className={th}>{t('election.democrats')} / {t('election.republicans')}</th>
                  <th className={`${th} text-end`}>{t('election.inColumn')}</th>
                </tr>
              </thead>
              <tbody>
                {e.senate.races.map((r) => (
                  <tr key={`${r.state}${r.special}`} className="border-b border-[var(--rule)] last:border-0">
                    <td className={`${td} font-medium`}>
                      {r.state}
                      {r.special ? <span className="ms-1 text-xs text-[var(--soft)]">{t('election.special')}</span> : null}
                      {r.flip ? <span className="ms-2 rounded bg-blue-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">{t('election.flipped')}</span> : null}
                    </td>
                    <td className={`${td} ${r.winner ? TEXT_TONE[r.winner] : 'text-[var(--soft)]'}`}>
                      {r.winner ? r.candidates.find((c) => c.party === r.winner)?.name : t('election.uncalled')}
                    </td>
                    <td className={td}>
                      {r.candidates.map((c, i) => (
                        <span key={c.name}>
                          {i ? ' · ' : ''}
                          <span className={TEXT_TONE[c.party]}>{c.name}</span> {c.pct.toFixed(1)}%
                        </span>
                      ))}
                    </td>
                    <td className={`${td} text-end text-[var(--soft)]`}>{r.pctIn != null ? t('election.pctIn', { pct: r.pctIn.toFixed(1) }) : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="house-battlegrounds">
          <h2 id="house-battlegrounds" className="mb-3 text-2xl font-semibold">{t('election.houseBattlegrounds')}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {e.house.battlegrounds.map((b) => (
              <div key={`${b.state}${b.district}`} className={card}>
                <div className="text-xs text-[var(--soft)]">{b.state} · {t('election.district', { n: b.district })}</div>
                <div className={`mt-1 flex items-baseline justify-between gap-2 font-semibold ${TEXT_TONE[b.winnerParty]}`}><span>{b.winner}</span><span className="tabular-nums">{b.winnerPct.toFixed(1)}%</span></div>
                <div className={`flex items-baseline justify-between gap-2 text-sm ${TEXT_TONE[b.otherParty]}`}><span>{b.other}</span><span className="tabular-nums">{b.otherPct.toFixed(1)}%</span></div>
                <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-[var(--rule)]">
                  <span className={PARTY_TONE[b.winnerParty]} style={{ width: `${b.winnerPct}%` }} />
                  <span className={`${PARTY_TONE[b.otherParty]} ms-auto`} style={{ width: `${b.otherPct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.section} aria-labelledby="house-states">
          <h2 id="house-states" className="mb-3 text-2xl font-semibold">{t('election.houseByState')}</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {e.house.states.map((s) => (
              <div key={s.code} className={`${card} flex flex-col gap-1.5 py-2.5`}>
                <div className="flex items-baseline justify-between text-sm"><span className="font-medium">{s.state}</span><span className="text-xs text-[var(--soft)]">{t('election.seatsOf', { count: s.seats })}</span></div>
                <SeatBar democrats={s.democrats} republicans={s.republicans} total={s.seats} majority={s.seats / 2} label={`${s.state}: ${t('election.democrats')} ${s.democrats}, ${t('election.republicans')} ${s.republicans}`} className="h-2" />
                <div className="flex justify-between text-xs tabular-nums"><span className={TEXT_TONE.D}>{s.democrats}</span>{s.uncalled ? <span className="text-[var(--soft)]">{t('election.uncalledCount', { count: s.uncalled })}</span> : null}<span className={TEXT_TONE.R}>{s.republicans}</span></div>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.section} aria-labelledby="election-sources">
          <h2 id="election-sources" className="mb-2 text-lg font-semibold">{t('election.sources')}</h2>
          <p className="text-sm text-[var(--soft)]">{e.source.label}</p>
          <p className="mt-1 flex flex-wrap gap-4 text-sm">
            <a href={e.source.senateUrl} rel="noopener" className="underline underline-offset-2">{t('election.senate')}</a>
            <a href={e.source.houseUrl} rel="noopener" className="underline underline-offset-2">{t('election.house')}</a>
          </p>
        </section>
      </div>
    </main>
  );
}
