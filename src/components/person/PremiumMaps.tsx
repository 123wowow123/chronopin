'use client';

import { useEffect, useState } from 'react';
import { HoldingsMap } from '@/components/person/HoldingsMap';
import { Iv15Map } from '@/components/person/Iv15Map';
import Link from '@/components/ui/Link';
import { api } from '@/lib/client/api';
import { useT } from '@/lib/client/i18n';
import { useSession } from '@/lib/client/session';
import type { ValuationMaps } from '@/server/valuationMaps';

type Answer = ({ locked: false } & ValuationMaps) | { locked: true };

// The Holdings map and the Valuation map: C-IV15©, both Premium. Fetched per
// viewer because the person page itself is cached for everyone; a reader
// without Premium gets a prompt and no data.
export function PremiumMaps({ slug, name }: { slug: string; name: string }) {
  const t = useT();
  const { status } = useSession();
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (status !== 'ready') return;
    let cancelled = false;
    api.get<Answer>(`/api/valuation-maps/${slug}`).then(a => !cancelled && setAnswer(a)).catch(() => !cancelled && setFailed(true));
    return () => { cancelled = true; };
  }, [slug, status]);

  return (
    <section id="holdings-map" aria-labelledby="holdings-map-heading" className="scroll-mt-20">
      <div className="mb-5 border-s-4 border-accent ps-4">
        <h2 id="holdings-map-heading" className="flex items-center gap-2.5 text-2xl font-semibold tracking-tight">
          {t('premium.mapsHeading')}
          <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-xs font-semibold text-accent">{t('premium.title')}</span>
        </h2>
        {answer && !answer.locked ? <p className="mt-1.5 max-w-3xl text-xs leading-relaxed text-subtle">{t('person.holdings.mapAbout')}</p> : null}
      </div>
      {answer && !answer.locked ? (
        <div className="flex flex-col gap-5">
          {answer.maps.map(m => (
            <article key={m.key} className="floating min-w-0 p-4 sm:p-5">
              <h3 className="mb-3 text-lg font-semibold">{m.name}</h3>
              <HoldingsMap points={m.placed} unplaced={m.unplaced} t={t} />
            </article>
          ))}
          {answer.iv15.length ? (
            <article className="floating min-w-0 p-4 sm:p-5">
              <h3 className="mb-3 text-lg font-semibold">{t('person.holdings.iv15Title')}</h3>
              <Iv15Map points={answer.iv15} name={name} t={t} />
            </article>
          ) : null}
        </div>
      ) : !answer && !failed ? (
        <div className="h-72 animate-pulse rounded-xl border border-line bg-panel motion-reduce:animate-none" role="status" aria-busy="true" aria-label={t('premium.loading')} />
      ) : (
        <div className="surface space-y-3 p-6 text-center">
          <p className="text-lg font-semibold">{t('premium.mapsLockedTitle')}</p>
          <p className="mx-auto max-w-xl text-muted">{t('premium.mapsLockedBody')}</p>
          <Link href="/premium" className="btn btn-primary">{t('premium.goPremium')}</Link>
        </div>
      )}
    </section>
  );
}
