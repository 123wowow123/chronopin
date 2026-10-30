'use client';

import Anchor from '@/components/ui/Anchor';
import Link from '@/components/ui/Link';
import { PostedTime } from '@/components/ui/LocalTime';
import { useT } from '@/lib/client/i18n';
import { useTimeZone } from '@/lib/client/timeZone';
import { dayKeyIn, formatPosted, money } from '@/lib/format';
import { delayLabel } from '@/lib/delay';
import { changedDay, type PinChange, type PinUpdateJson, type PinUpdateReference } from '@/lib/pinUpdates';
import { diffCounts, type DiffSegment } from '@/lib/textDiff';
import { pinPath } from '@/lib/seo';
import type { Translator } from '@/lib/i18n/translate';
import { formatDay, formatDayRange } from './DateRanges';
import { ConfidenceBadge, confidenceClass } from './PinConfidence';
import { RefineLink } from './RefineLink';

// Updates shown before the rest fold away: just the latest.
const SHOWN = 1;

function hostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

// What a pin says now, and how it got there: each change after it was posted
// (PinUpdate, 0081), newest first - the reference, newer pin or edit that
// brought it, the fields it moved from and to, and the article rewritten from
// the new links. Renders nothing for a pin that has not changed.
export function PinUpdates({ updates, timeZone, className = '' }: { updates: PinUpdateJson[]; timeZone: string; className?: string }) {
  const t = useT();
  if (!updates.length) return null;
  const shown = updates.slice(0, SHOWN);
  const folded = updates.slice(SHOWN);
  return (
    <section id="updates" aria-labelledby="updates-heading" className={`surface scroll-mt-20 p-5 ${className}`}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="updates-heading" className="text-base font-semibold">
          {t('updates.heading')}
        </h2>
        <span className="text-xs text-subtle">{t('updates.count', { count: updates.length })}</span>
      </div>
      <p className="mt-1 text-sm text-muted">{t('updates.intro')}</p>
      <ol className="mt-4 space-y-5 border-s border-line ps-4">
        {shown.map((update) => (
          <UpdateRow key={update.id} update={update} timeZone={timeZone} />
        ))}
      </ol>
      {folded.length ? (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm text-subtle hover:text-ink">{t('updates.showEarlier', { count: folded.length })}</summary>
          <ol className="mt-4 space-y-5 border-s border-line ps-4">
            {folded.map((update) => (
              <UpdateRow key={update.id} update={update} timeZone={timeZone} />
            ))}
          </ol>
        </details>
      ) : null}
    </section>
  );
}

function UpdateRow({ update, timeZone }: { update: PinUpdateJson; timeZone: string }) {
  const t = useT();
  const { relatedPin, user } = update;
  return (
    <li className="relative">
      {/* The dot on the line the updates hang from. */}
      <span aria-hidden className="absolute top-1.5 -start-[21px] size-2.5 rounded-full bg-link ring-4 ring-panel" />
      <p className="flex flex-wrap items-baseline gap-x-2 text-xs text-subtle">
        <span className="font-semibold tracking-wider text-muted uppercase">{t(`updates.${update.kind}`)}</span>
        <PostedTime value={update.utcCreatedDateTime} serverTimeZone={timeZone} />
        {user?.userName ? (
          <span>
            {t.rich('updates.by', {
              user: () => (
                <RefineLink field="user" value={user.userName} className="text-inherit hover:text-ink hover:no-underline">
                  {user.userName}
                </RefineLink>
              ),
            })}
          </span>
        ) : null}
      </p>
      {update.note ? <p className="mt-1.5 text-sm font-medium text-ink">{update.note}</p> : null}
      {relatedPin ? (
        <p className="mt-1.5 text-sm text-muted">
          {t.rich('updates.fromPin', {
            pin: () => (
              <Link href={pinPath(relatedPin)} className="font-medium">
                {relatedPin.title}
              </Link>
            ),
          })}
        </p>
      ) : null}
      {update.changes.length ? (
        <dl className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-sm">
          {update.changes.map((change) => (
            <ChangeRow key={change.field} change={change} timeZone={timeZone} />
          ))}
        </dl>
      ) : null}
      {update.references.length ? (
        <ul className="mt-2 space-y-1.5">
          {update.references.map((reference) => (
            // A newer pin's source is named by the pin above it: just the site.
            <ReferenceRow key={reference.url} reference={reference} siteOnly={!!relatedPin} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

// A changed date as the pin page shows dates: an all-day pin's as its UTC
// day, a timed one's in the viewer's zone.
function formatChangedDate(change: PinChange, value: string | null, timeZone: string, t: Translator) {
  const at = changedDay(value, change.allDay, change.field as 'start' | 'end');
  if (!at) return t('updates.none');
  return change.allDay ? formatDay(dayKeyIn(at, 'UTC'), t.locale) : formatPosted(at, timeZone, {}, t.locale);
}

function ChangeRow({ change, timeZone: serverTimeZone }: { change: PinChange; timeZone: string }) {
  const t = useT();
  const timeZone = useTimeZone(serverTimeZone);
  const label = <dt className="text-subtle">{t(`updates.${change.field}`)}</dt>;

  // Long text, rewritten: the words it lost and gained, a tap away.
  if (change.diff && (change.field === 'longFormSummary' || change.field === 'description')) {
    const { added, removed } = diffCounts(change.diff);
    return (
      <>
        {label}
        <dd className="min-w-0 text-muted">
          <details>
            <summary className="cursor-pointer hover:text-ink">
              {t('updates.rewritten')} <span className="text-xs text-subtle tabular-nums">{t('updates.words', { added, removed })}</span>
            </summary>
            <p className="mt-1.5 border-s-2 border-line ps-3 text-[13px] leading-relaxed" lang="en">
              <DiffText segments={change.diff} />
            </p>
          </details>
        </dd>
      </>
    );
  }

  // Long text with no earlier version to compare: that it was rewritten, with
  // what it said before a tap away.
  if (change.field === 'longFormSummary' || change.field === 'description') {
    return (
      <>
        {label}
        <dd className="min-w-0 text-muted">
          {change.before ? (
            <details>
              <summary className="cursor-pointer hover:text-ink">{t('updates.rewritten')}</summary>
              <div className="rich-text mt-1.5 border-s-2 border-line ps-3 text-[13px] text-subtle" lang="en">
                <p className="mb-1 text-[11px] font-semibold tracking-wider uppercase">{t('updates.before')}</p>
                {/* Sanitized on the server (pinUpdates in services/pages.ts). */}
                <div dangerouslySetInnerHTML={{ __html: change.before }} />
              </div>
            </details>
          ) : (
            t('updates.rewritten')
          )}
        </dd>
      </>
    );
  }

  if (change.diff && change.field === 'title') {
    return (
      <>
        {label}
        <dd className="min-w-0" lang="en">
          <DiffText segments={change.diff} />
        </dd>
      </>
    );
  }

  const show = (value: string | null) => {
    if (value == null) return t('updates.none');
    if (change.field === 'start' || change.field === 'end') return formatChangedDate(change, value, timeZone, t);
    if (change.field === 'price') return money(Number(value));
    return value;
  };
  return (
    <>
      {label}
      <dd className="min-w-0">
        <span className="text-subtle line-through decoration-subtle/60" lang={change.field === 'title' ? 'en' : undefined}>
          {show(change.before)}
        </span>
        <span aria-hidden className="inline-block px-1.5 text-faint rtl:-scale-x-100">
          →
        </span>
        <span className="font-medium text-ink" lang={change.field === 'title' ? 'en' : undefined}>
          {show(change.after)}
        </span>
        <MovedBy change={change} />
      </dd>
    </>
  );
}

// Removed words struck in red, added ones in green, the rest as written.
function DiffText({ segments }: { segments: DiffSegment[] }) {
  return segments.map((segment, i) =>
    segment.op === 'del' ? (
      <del key={i} className="rounded-sm bg-danger/10 text-danger-soft decoration-danger/50">
        {segment.text}
      </del>
    ) : segment.op === 'ins' ? (
      <ins key={i} className="rounded-sm bg-success/10 text-success-soft no-underline">
        {segment.text}
      </ins>
    ) : (
      <span key={i}>{segment.text}</span>
    ),
  );
}

// How far a start moved: "3 weeks later", "5 days earlier". Only for starts,
// and by whole UTC days, as a delay is counted (delay.ts).
function MovedBy({ change }: { change: PinChange }) {
  const t = useT();
  if (change.field !== 'start') return null;
  const from = changedDay(change.before, change.allDay, 'start');
  const to = changedDay(change.after, change.allDay, 'start');
  if (!from || !to) return null;
  const a = dayKeyIn(from, 'UTC');
  const b = dayKeyIn(to, 'UTC');
  if (a === b) return null;
  const later = b > a;
  const span = later ? delayLabel(a, b, t.locale) : delayLabel(b, a, t.locale);
  return (
    <span className={`ms-2 text-xs font-medium ${later ? 'text-danger-soft' : 'text-success-soft'}`}>
      {t(later ? 'updates.later' : 'updates.earlier', { span })}
    </span>
  );
}

function ReferenceRow({ reference, siteOnly }: { reference: PinUpdateReference; siteOnly?: boolean }) {
  const t = useT();
  const { locale } = t;
  const days =
    reference.startDate && reference.endDate && reference.endDate !== reference.startDate
      ? formatDayRange(reference.startDate, reference.endDate, locale)
      : reference.startDate
        ? formatDay(reference.startDate, locale)
        : null;
  return (
    <li className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
      <Anchor href={reference.url} target="_blank" rel="noopener" className="min-w-0 font-medium break-words">
        {(!siteOnly && reference.title) || hostname(reference.url)}
      </Anchor>
      {siteOnly ? null : <span className="text-xs text-subtle">{hostname(reference.url)}</span>}
      {reference.confidence != null ? (
        <ConfidenceBadge confidence={reference.confidence} className={confidenceClass(reference.confidence)} title={t('confidence.badge', { percent: reference.confidence })}>
          {t('confidence.badge', { percent: reference.confidence })}
        </ConfidenceBadge>
      ) : null}
      {days ? <span className="text-xs text-muted">{t('updates.says', { date: days })}</span> : null}
    </li>
  );
}
