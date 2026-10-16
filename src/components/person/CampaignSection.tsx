import Anchor from '@/components/ui/Anchor';
import { dateFormat } from '@/lib/format';
import { INTL_LOCALES } from '@/lib/i18n/config';
import type { Translator } from '@/lib/i18n/translate';
import { displayName, PARTY_NAMES, type CampaignCycle } from '@/lib/campaigns';

const usd = (n: number | null) => (n == null ? '—' : n < 0 ? `-$${Math.round(-n).toLocaleString('en-US')}` : `$${Math.round(n).toLocaleString('en-US')}`);
const compact = (n: number | null) => (n == null ? '—' : Math.abs(n) >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : Math.abs(n) >= 1e3 ? `$${Math.round(n / 1e3)}K` : `$${Math.round(n)}`);
const party = (p: string | null) => (p ? (PARTY_NAMES[p] ?? p) : '');

// A person's campaign finance, one block per election cycle: what they raised
// and spent and where it came from, the PACs that gave most, and the other
// candidates in the race ("opponents") with theirs. FEC figures, through the
// coverage date each block states.
export function CampaignSection({ campaigns, name, t }: { campaigns: CampaignCycle[]; name: string; t: Translator }) {
  const intl = INTL_LOCALES[t.locale];
  const day = (iso: string) => dateFormat(intl, { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${iso}T00:00:00Z`));
  const tile = 'floating flex flex-col gap-1 px-4 py-3';
  return (
    <section id="campaign" aria-labelledby="campaign-heading" className="scroll-mt-20">
      <div className="mb-5 border-s-4 border-accent ps-4">
        <h2 id="campaign-heading" className="flex items-center gap-2.5 text-2xl font-semibold tracking-tight">
          {t('person.campaign.title')}
          <span className="rounded-full bg-raised px-2.5 py-0.5 text-xs font-medium text-muted tabular-nums">{campaigns.length}</span>
        </h2>
        <p className="mt-1.5 max-w-3xl text-xs leading-relaxed text-subtle">{t('person.campaign.about')}</p>
      </div>
      <div className="flex flex-col gap-4">
        {campaigns.map((c, i) => {
          const raised = c.receipts ?? 0;
          const parts: [string, number | null][] = [
            [t('person.campaign.individual'), c.individual],
            [t('person.campaign.pac'), c.pac],
            [t('person.campaign.partyCommittee'), c.partyCommittee],
            [t('person.campaign.selfFunded'), c.selfFunded],
          ];
          const race = [{ self: true, fecCandidateId: c.fecCandidateId, name, party: c.party, status: c.status, receipts: c.receipts, disbursements: c.disbursements, cashOnHand: c.cashOnHand, votePct: c.votePct, sourceUrl: c.sourceUrl }, ...c.rivals.map((r) => ({ self: false, ...r, name: displayName(r.name) }))];
          return (
            <details key={c.cycle} open={i === 0} className="floating group">
              <summary className="flex cursor-pointer flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
                <span className="text-lg font-semibold">{t('person.campaign.cycle', { year: String(c.cycle) })}</span>
                <span className="text-sm text-muted">
                  {c.office === 'S' ? `${c.state} Senate` : `${c.state}-${c.district === '00' ? 'AL' : c.district}`}
                  {c.status ? ` · ${t.dynamic(`person.campaign.statuses.${c.status}`, c.status)}` : ''}
                </span>
                <span className="ms-auto text-sm tabular-nums">{t('person.campaign.raised')}: {compact(c.receipts)}</span>
              </summary>
              <div className="border-t border-line p-4">
                <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className={tile}><span className="text-xs text-subtle">{t('person.campaign.raised')}</span><span className="text-xl font-semibold tabular-nums">{usd(c.receipts)}</span></div>
                  <div className={tile}><span className="text-xs text-subtle">{t('person.campaign.spent')}</span><span className="text-xl font-semibold tabular-nums">{usd(c.disbursements)}</span></div>
                  <div className={tile}><span className="text-xs text-subtle">{t('person.campaign.cash')}</span><span className="text-xl font-semibold tabular-nums">{usd(c.cashOnHand)}</span></div>
                  <div className={tile}><span className="text-xs text-subtle">{t('person.campaign.debts')}</span><span className="text-xl font-semibold tabular-nums">{usd(c.debts)}</span></div>
                </div>
                {raised > 0 ? (
                  <div className="mb-4">
                    <div className="flex h-3 overflow-hidden rounded-full bg-raised" role="img" aria-label={parts.map(([l, v]) => `${l} ${compact(v)}`).join(', ')}>
                      {parts.map(([l, v], k) => (v && v > 0 ? <span key={l} title={`${l}: ${usd(v)}`} style={{ width: `${Math.min(100, (v / raised) * 100)}%`, opacity: 1 - k * 0.2 }} className="bg-accent" /> : null))}
                    </div>
                    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                      {parts.filter(([, v]) => v && v > 0).map(([l, v]) => (
                        <li key={l}>{l}: <span className="tabular-nums text-ink">{compact(v)}</span> <span className="text-subtle">({Math.round(((v ?? 0) / raised) * 100)}%)</span></li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {c.pacs.length ? (
                  <div className="mb-4">
                    <h3 className="mb-1.5 text-sm font-semibold">{t('person.campaign.topPacs')}</h3>
                    <ul className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                      {c.pacs.map((p) => (
                        <li key={p.committeeId} className="flex items-baseline justify-between gap-3 border-b border-line py-1">
                          <Anchor href={p.sourceUrl} className="truncate">{p.name}</Anchor>
                          <span className="tabular-nums">{usd(p.amount)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {c.rivals.length ? (
                  <div>
                    <h3 className="mb-1.5 text-sm font-semibold">{t('person.campaign.race')}</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-xs text-subtle">
                            {(['candidate', 'party', 'status', 'raised', 'spent', 'cash', 'vote'] as const).map((k) => (
                              <th key={k} scope="col" className="px-2 py-1.5 text-start font-medium">{t(`person.campaign.${k}`)}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {race.map((r) => (
                            <tr key={r.fecCandidateId} className={`border-t border-line ${r.self ? 'bg-raised font-medium' : ''}`}>
                              <td className="px-2 py-1.5"><Anchor href={r.sourceUrl}>{r.self ? name : r.name}</Anchor></td>
                              <td className="px-2 py-1.5 whitespace-nowrap text-muted">{party(r.party)}</td>
                              <td className="px-2 py-1.5 whitespace-nowrap text-muted">{r.status ? t.dynamic(`person.campaign.statuses.${r.status}`, r.status) : ''}</td>
                              <td className="px-2 py-1.5 tabular-nums">{compact(r.receipts)}</td>
                              <td className="px-2 py-1.5 tabular-nums">{compact(r.disbursements)}</td>
                              <td className="px-2 py-1.5 tabular-nums">{compact(r.cashOnHand)}</td>
                              <td className="px-2 py-1.5 tabular-nums">{r.votePct != null ? `${r.votePct}%` : ''}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : null}
                {c.coverageEnd ? <p className="mt-3 text-xs text-subtle">{t('person.campaign.through', { date: day(c.coverageEnd) })} · <Anchor href={c.sourceUrl}>{t('person.campaign.fecLink')}</Anchor></p> : null}
              </div>
            </details>
          );
        })}
      </div>
    </section>
  );
}
