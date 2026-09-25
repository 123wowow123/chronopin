'use client';

import Link from '@/components/ui/Link';
import { PostedTime } from '@/components/ui/LocalTime';
import { useT } from '@/lib/client/i18n';
import { useTimeZone } from '@/lib/client/timeZone';
import { dayKeyIn, formatPosted, money } from '@/lib/format';
import { changedDay, type PinChange, type PinUpdateJson, type PinUpdateReference } from '@/lib/pinUpdates';
import { pinPath } from '@/lib/seo';
import type { Translator } from '@/lib/i18n/translate';
import { formatDay, formatDayRange } from './DateRanges';
import { ConfidenceBadge, confidenceClass } from './PinConfidence';
import { RefineLink } from './RefineLink';

// Updates shown before the rest fold away.
const SHOWN = 3;

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
      <ol className="mt-4 space-y-5 border-l border-line pl-4">
        {shown.map((update) => (
          <UpdateRow key={update.id} update={update} timeZone={timeZone} />
        ))}
      </ol>
      {folded.length ? (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm text-subtle hover:text-ink">{t('updates.showEarlier', { count: folded.length })}</summary>
          <ol className="mt-4 space-y-5 border-l border-line pl-4">
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
      <span aria-hidden className="absolute top-1.5 -left-[21px] size-2.5 rounded-full bg-link ring-4 ring-panel" />
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

  // Long text: that it was rewritten, with what it said before a tap away.
  if (change.field === 'longFormSummary' || change.field === 'description') {
    return (
      <>
        {label}
        <dd className="min-w-0 text-muted">
          {change.before ? (
            <details>
              <summary className="cursor-pointer hover:text-ink">{t('updates.rewritten')}</summary>
              <div className="rich-text mt-1.5 border-l-2 border-line pl-3 text-[13px] text-subtle" lang="en">
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
        <span aria-hidden className="px-1.5 text-faint">
          →
        </span>
        <span className="font-medium text-ink" lang={change.field === 'title' ? 'en' : undefined}>
          {show(change.after)}
        </span>
      </dd>
    </>
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
      <a href={reference.url} target="_blank" rel="noopener" className="min-w-0 font-medium break-words">
        {(!siteOnly && reference.title) || hostname(reference.url)}
      </a>
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
