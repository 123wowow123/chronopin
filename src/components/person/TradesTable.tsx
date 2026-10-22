'use client';

import { useState } from 'react';
import Anchor from '@/components/ui/Anchor';
import { Icon } from '@/components/ui/Icon';
import { useT } from '@/lib/client/i18n';
import { dateFormat } from '@/lib/format';
import { INTL_LOCALES } from '@/lib/i18n/config';
import { safeUrl } from '@/lib/people';
import { formatAmountRange, type TradeRow } from '@/lib/trades';

// How many more rows one click on "More" loads.
const BATCH = 100;

// A person's disclosed trades, newest first: the first rows arrive with the page, the
// rest are fetched a batch at a time, so a person with thousands costs nothing up front.
export function TradesTable({ personId, initial, total }: { personId: number; initial: TradeRow[]; total: number }) {
  const t = useT();
  const [rows, setRows] = useState(initial);
  const [loading, setLoading] = useState(false);
  const intl = INTL_LOCALES[t.locale];
  const day = (iso: string) => dateFormat(intl, { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${iso}T00:00:00Z`));

  const more = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/people/${personId}/trades?limit=${BATCH}&offset=${rows.length}`);
      if (!res.ok) return;
      const body = (await res.json()) as { trades: TradeRow[] };
      setRows((current) => {
        const seen = new Set(current.map((r) => r.id));
        return [...current, ...body.trades.filter((r) => !seen.has(r.id))];
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="floating overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-start text-xs text-subtle">
              {(['date', 'asset', 'type', 'amount', 'owner', 'filing'] as const).map((k) => (
                <th key={k} scope="col" className="px-3 py-2 text-start font-medium">
                  {t(`person.trades.${k}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((tr) => {
              const url = safeUrl(tr.sourceUrl);
              return (
                <tr key={tr.id} className="border-t border-line align-top">
                  <td className="px-3 py-2 whitespace-nowrap tabular-nums text-muted">{day(tr.txDate)}</td>
                  <td className="px-3 py-2">
                    <span className="font-medium text-ink">{tr.ticker ?? '—'}</span>
                    <span className="block max-w-xs text-xs text-subtle">{tr.asset}</span>
                    {tr.conflicts?.length ? (
                      <span
                        className="mt-1 inline-flex max-w-xs items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-[11px] font-semibold text-warning-soft ring-1 ring-warning/40 ring-inset"
                        title={t('person.conflict.hint', { committees: [...new Set(tr.conflicts.map((c) => c.committee.split(': ')[0]))].slice(0, 3).join('; '), sector: t.dynamic(`person.sectors.${tr.conflicts[0].sector}`, tr.conflicts[0].sector) })}
                      >
                        <Icon name="warning" className="size-3 shrink-0" />
                        <span className="truncate">{t('person.conflict.label')}</span>
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className={tr.txType === 'purchase' ? 'text-success' : tr.txType === 'exchange' ? 'text-muted' : 'text-danger'}>{t(`person.trades.types.${tr.txType}`)}</span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap tabular-nums">{formatAmountRange(tr.amountLow, tr.amountHigh)}</td>
                  {/* A 278-T does not say whose account a trade was in. */}
                  <td className="px-3 py-2 whitespace-nowrap text-muted">{tr.chamber === 'executive' ? '—' : t(`person.trades.owners.${tr.owner}`)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {url ? (
                      <Anchor href={url} className="text-xs" title={tr.filedDate ? `${t('person.trades.filed')} ${day(tr.filedDate)}` : undefined}>
                        {t('person.trades.read')}
                      </Anchor>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {rows.length < total ? (
        <div className="mt-3 flex justify-center">
          <button
            type="button"
            onClick={more}
            disabled={loading}
            aria-busy={loading}
            className="rounded-full bg-field px-5 py-2 text-sm font-medium text-ink ring-1 ring-line ring-inset hover:bg-raised disabled:opacity-60"
          >
            {t('person.more')} · {total - rows.length}
          </button>
        </div>
      ) : null}
    </>
  );
}
