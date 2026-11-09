import type { Metadata } from 'next';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { DamsMapLoader } from '@/components/dams/DamsMapLoader';
import Link from '@/components/ui/Link';
import { siteName } from '@/lib/appConfig';
import { DAM_SCOPE_WORDS, acreFeet, aggregateDams, usdShort } from '@/lib/damSpecs';
import { alternates } from '@/lib/i18n/server';
import { damRows } from '@/server/model/pinDam';
import { siteCardImages } from '@/server/services/shareCard';

const TITLE = 'US dam construction';
const DESCRIPTION = 'Dams being built, raised or made safe across the United States: how many, where, what they cost, how much water they store and how much power they can make.';

export async function generateMetadata(): Promise<Metadata> {
  await connection();
  const images = await siteCardImages();
  const links = await alternates('/dams');
  return {
    title: TITLE,
    description: DESCRIPTION,
    alternates: links,
    openGraph: { type: 'website', siteName, url: links.canonical, title: `${TITLE} · ${siteName}`, description: DESCRIPTION, images },
    twitter: { card: 'summary_large_image', title: `${TITLE} · ${siteName}`, description: DESCRIPTION, images: images.map((i) => i.url) },
  };
}

export default function DamsPage() {
  return (
    <Suspense fallback={<div className="mx-auto h-[70vh] max-w-[90rem] animate-pulse rounded-xl bg-panel" aria-busy="true" />}>
      <Dams />
    </Suspense>
  );
}

async function Dams() {
  await connection();
  const dams = await damRows();
  const { totals, byState } = aggregateDams(dams);
  const tile = (label: string, value: string, sub: string | null) => (
    <div className="flex flex-col rounded-xl border border-line/70 bg-panel/70 p-3">
      <div className="text-[11px] font-semibold tracking-wider text-subtle uppercase">{label}</div>
      <div className="mt-1.5 text-xl leading-tight font-bold tracking-tight text-ink tabular-nums">{value}</div>
      {sub ? <div className="mt-1 text-xs text-muted tabular-nums">{sub}</div> : null}
    </div>
  );
  const tallest = totals.tallestId != null ? dams.find((d) => d.id === totals.tallestId) : null;
  return (
    <main className="mx-auto w-full max-w-[90rem] px-4 py-6" data-dams-page>
      <h1 className="text-2xl font-semibold">{TITLE}</h1>
      <p className="mt-1 max-w-3xl text-muted">{DESCRIPTION}</p>
      {dams.length ? (
        <>
          <section data-dams-stats aria-label="Dam statistics" className="surface mt-4 rounded-2xl border border-line bg-raised/40 p-4 shadow-sm">
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
              {tile('Projects', String(totals.count), `${totals.states} state${totals.states === 1 ? '' : 's'}`)}
              {tile('Published cost', totals.costUsd > 0 ? usdShort(totals.costUsd) : 'n/a', totals.pricedCount ? `${totals.pricedCount} priced, USD only` : 'no USD prices yet')}
              {tile('Storage', totals.storageAcreFt + totals.addedStorageAcreFt > 0 ? acreFeet(totals.storageAcreFt + totals.addedStorageAcreFt) : 'n/a', totals.addedStorageAcreFt > 0 ? `${acreFeet(totals.addedStorageAcreFt)} newly added` : null)}
              {tile('Capacity', totals.capacityMw > 0 ? `${Math.round(totals.capacityMw).toLocaleString('en-US')} MW` : 'n/a', 'pumped storage / hydro')}
              {tile('Tallest', totals.tallestFt != null ? `${Math.round(totals.tallestFt).toLocaleString('en-US')} ft` : 'n/a', tallest?.title ?? null)}
              {tile('Status', Object.entries(totals.byStatus).map(([k, v]) => `${v} ${k}`).join(' · '), Object.entries(totals.byScope).map(([k, v]) => `${v} ${DAM_SCOPE_WORDS[k as keyof typeof DAM_SCOPE_WORDS].toLowerCase()}`).join(' · ') || null)}
            </div>
            <p className="mt-3 border-t border-line/70 pt-3 text-xs text-muted">Sums use only figures the cited sources publish; a missing figure is left out, not estimated. Storage adds each project&apos;s total reservoir storage and any added storage; cost adds USD prices only (no currency conversion).</p>
          </section>
          <section className="mt-4"><DamsMapLoader byState={byState} dams={dams} /></section>
          <section className="mt-6" aria-label="By state">
            <h2 className="text-xs font-semibold tracking-wider text-subtle uppercase">By state</h2>
            <div className="mt-2 overflow-x-auto rounded-xl border border-line">
              <table className="w-full text-sm tabular-nums">
                <thead className="bg-panel text-left text-xs text-subtle"><tr><th className="p-2">State</th><th className="p-2">Projects</th><th className="p-2">Cost</th><th className="p-2">Storage</th><th className="p-2">MW</th></tr></thead>
                <tbody>
                  {byState.map((s) => (
                    <tr key={s.state} className="border-t border-line/60">
                      <td className="p-2 font-medium">{s.state}</td><td className="p-2">{s.count}</td>
                      <td className="p-2">{s.costUsd > 0 ? usdShort(s.costUsd) : '–'}</td>
                      <td className="p-2">{s.storageAcreFt + s.addedStorageAcreFt > 0 ? acreFeet(s.storageAcreFt + s.addedStorageAcreFt) : '–'}</td>
                      <td className="p-2">{s.capacityMw > 0 ? Math.round(s.capacityMw).toLocaleString('en-US') : '–'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section className="mt-6" aria-label="Projects">
            <h2 className="text-xs font-semibold tracking-wider text-subtle uppercase">Projects</h2>
            <ul className="mt-2 divide-y divide-line/60 rounded-xl border border-line">
              {dams.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
                  <Link href={d.href} className="font-medium">{d.title}</Link>
                  <span className="text-xs text-muted">{[d.state, d.status, d.price != null && d.priceCurrency === 'USD' ? usdShort(d.price) : null].filter(Boolean).join(' · ')}</span>
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : <p className="mt-4 rounded-xl border border-line bg-panel p-6 text-muted">No dam projects are pinned yet.</p>}
    </main>
  );
}
