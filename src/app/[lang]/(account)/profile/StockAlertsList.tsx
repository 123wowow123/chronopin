'use client';

import { useState } from 'react';
import { api } from '@/lib/client/api';
import { useT } from '@/lib/client/i18n';
import { blobUrl } from '@/lib/appConfig';
import Link from '@/components/ui/Link';

type Item = { image?: string | null; round?: boolean; key: string; label: string; href: string; detail?: string | null; path: string };
export type StockAlerts = {
  companies: { id: number; name: string; tickerSymbol: string | null; logoUrl: string | null }[];
  people: { id: number; name: string; slug: string; photoUrl: string | null }[];
  watchingAll: boolean;
  threads: { id: number; title: string; thumb: string | null }[];
  pins: { id: number; title: string; thumb: string | null }[];
};

// One row with a plain button that ends the follow or watch, left in place as
// a Follow-again button so a slip can be undone.
// A small picture for the row, or the first letter on a tile when there is none
// (or it does not load).
function Thumb({ src, label, round }: { src?: string | null; label: string; round?: boolean }) {
  const [failed, setFailed] = useState(false);
  const url = blobUrl(src);
  const shape = `size-9 shrink-0 ${round ? 'rounded-full' : 'rounded-md'}`;
  return url && !failed ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} className={`${shape} bg-raised-2 object-cover`} />
  ) : (
    <span aria-hidden className={`${shape} flex items-center justify-center bg-raised-2 text-sm font-semibold text-subtle`}>
      {label.replace(/^[@$\s]+/, '').charAt(0).toUpperCase()}
    </span>
  );
}

function Row({ item }: { item: Item }) {
  const t = useT();
  const [on, setOn] = useState(true);
  const [busy, setBusy] = useState(false);
  async function toggle() {
    setBusy(true);
    try {
      if (on) await api.delete(item.path);
      else await api.post(item.path);
      setOn(!on);
    } finally {
      setBusy(false);
    }
  }
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <Thumb src={item.image} label={item.label} round={item.round} />
      <Link href={item.href} className="min-w-0 flex-1 truncate font-semibold text-ink hover:text-link hover:no-underline">
        {item.label}
        {item.detail ? <span className="ms-2 text-sm font-normal text-subtle">{item.detail}</span> : null}
      </Link>
      <button type="button" onClick={toggle} disabled={busy} className={`btn rounded-full px-4 py-1.5 ${on ? 'btn-secondary hover:text-danger-soft' : 'btn-primary'}`}>
        {t(on ? 'follow.unfollow' : 'follow.follow')}
      </button>
    </li>
  );
}

function Group({ title, empty, items }: { title: string; empty: string; items: Item[] }) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      {items.length ? (
        <ul className="surface divide-y divide-line lg:grid lg:grid-cols-2 lg:[&>li:only-child]:col-span-2 lg:divide-y-0 lg:[&>li]:border-b lg:[&>li]:border-line [&>li:last-child]:border-b-0 lg:[&>li:nth-last-child(2):nth-child(odd)]:border-b-0">
          {items.map((i) => (
            <Row key={i.key} item={i} />
          ))}
        </ul>
      ) : (
        <p className="surface px-4 py-6 text-center text-subtle">{empty}</p>
      )}
    </section>
  );
}

// The companies (stocks) the viewer follows, the people whose stock trades
// they watch, and the threads and pins they watch, each with an Unfollow button.
export function StockAlertsList({ alerts }: { alerts: StockAlerts }) {
  const t = useT();
  const items: Item[] = [
    ...(alerts.watchingAll ? [{ key: 'all', label: t('profile.allTrades'), image: null, href: '/trades', path: '/api/people/trade-watch' }] : []),
    ...alerts.people.map((p) => ({ key: `p${p.id}`, label: p.name, image: p.photoUrl, round: true, href: `/person/${p.slug}`, path: `/api/people/${p.id}/trade-watch` })),
  ];
  return (
    <div className="space-y-8">
      <Group title={t('profile.tradeWatches')} empty={t('profile.tradeWatchesNone')} items={items} />
      <Group
        title={t('profile.followedCompanies')}
        empty={t('profile.followedCompaniesNone')}
        items={alerts.companies.map((c) => ({
          key: `c${c.id}`,
          label: c.name,
          detail: c.tickerSymbol,
          image: c.logoUrl,
          href: `/search?q=${encodeURIComponent(`company:${c.name}`)}`,
          path: `/api/companies/${c.id}/follow`,
        }))}
      />
      <Group
        title={t('profile.watchedThreads')}
        empty={t('profile.watchedThreadsNone')}
        items={alerts.threads.map((p) => ({ key: `t${p.id}`, label: p.title, image: p.thumb, href: `/pin/${p.id}`, path: `/api/pins/${p.id}/thread-watch` }))}
      />
      <Group
        title={t('profile.watchedPins')}
        empty={t('profile.watchedPinsNone')}
        items={alerts.pins.map((p) => ({ key: `w${p.id}`, label: p.title, image: p.thumb, href: `/pin/${p.id}`, path: `/api/pins/${p.id}/favorite` }))}
      />
    </div>
  );
}
