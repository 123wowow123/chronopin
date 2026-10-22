import { COMMITTEE_ABOUT } from '@/lib/committeeAbout';
import type { Seat } from '@/lib/conflicts';
import type { Translator } from '@/lib/i18n/translate';

// The committees a sitting member of Congress serves on, each with the subcommittees
// they hold seats on and the industries it oversees: the context for the "conflict of
// interest" mark on a stock trade in one of those industries.
export function CommitteesSection({ seats, t }: { seats: Seat[]; t: Translator }) {
  const subs = (id: string) => seats.filter((s) => s.parentId === id);
  const top = seats.filter((s) => !s.parentId);
  // A subcommittee whose full committee the member is not listed on still shows.
  const orphans = seats.filter((s) => s.parentId && !top.some((c) => c.committeeId === s.parentId));
  const role = (s: Seat) => s.title ?? null;
  return (
    <section id="committees" aria-labelledby="committees-heading" className="scroll-mt-20">
      <div className="mb-5 border-s-4 border-accent ps-4">
        <h2 id="committees-heading" className="flex items-center gap-2.5 text-2xl font-semibold tracking-tight">
          {t('person.committees.title')}
          <span className="rounded-full bg-raised px-2.5 py-0.5 text-xs font-medium text-muted tabular-nums">{top.length + orphans.length}</span>
        </h2>
        <p className="mt-1.5 max-w-3xl text-xs leading-relaxed text-subtle">{t('person.committees.about')}</p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {[...top, ...orphans].map((c) => (
          <li key={c.committeeId} className="floating flex flex-col gap-2 px-4 py-3">
            <span className="flex items-baseline justify-between gap-2">
              <span className="font-medium text-ink">{c.parentId ? c.name.replace(/^.*?: /, '') : c.name}</span>
              {role(c) ? <span className="shrink-0 text-xs font-semibold text-accent">{role(c)}</span> : null}
            </span>
            {!c.parentId && COMMITTEE_ABOUT[c.committeeId] ? <p className="text-xs leading-relaxed text-muted">{COMMITTEE_ABOUT[c.committeeId]}</p> : null}
            {c.sectors.length ? (
              <span className="flex flex-wrap gap-1.5">
                {c.sectors.map((x) => (
                  <span key={x} className="rounded-md bg-raised px-1.5 py-0.5 text-xs text-muted">
                    {t.dynamic(`person.sectors.${x}`, x)}
                  </span>
                ))}
              </span>
            ) : null}
            {subs(c.committeeId).length ? (
              <ul className="flex flex-col gap-0.5 border-s border-line ps-3 text-xs text-subtle">
                {subs(c.committeeId).map((s) => (
                  <li key={s.committeeId}>
                    {s.name.replace(/^.*?: /, '')}
                    {role(s) ? <span className="text-accent"> · {role(s)}</span> : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
