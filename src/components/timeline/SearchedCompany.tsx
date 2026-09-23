'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { api } from '@/lib/client/api';
import { useRouter } from '@/lib/client/navigation';
import { useSession } from '@/lib/client/session';
import { savePendingAction, usePendingAction } from '@/lib/client/pendingAction';
import { authHrefHere } from '@/lib/client/returnSpot';
import { useT } from '@/lib/client/i18n';
import type { CommentMood } from '@/lib/commentMood';
import type { SearchedCompany as Company } from '@/lib/types';
import { CompanySentimentChart } from './CompanySentiment';

type Status = { companyId: number; followerCount: number; following: boolean };

// Follow a company: its new pins then land in the follower's bell, the way a
// followed person's do. The status is asked for per viewer, because the
// search results the company comes with are cached for everyone.
export function CompanyFollowButton({ company, showCount }: { company: Company; showCount?: boolean }) {
  const router = useRouter();
  const { isLoggedIn, status: sessionStatus, user } = useSession();
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  // Set once this viewer follows or unfollows here, so an answer that was
  // already on its way does not put back what they have just changed.
  const acted = useRef(false);
  const t = useT();

  useEffect(() => {
    let cancelled = false;
    if (sessionStatus !== 'ready') return;
    api
      .get<Status>(`/api/companies/${company.id}/follow`)
      .then((s) => !cancelled && !acted.current && setStatus(s))
      .catch(() => !cancelled && !acted.current && setStatus(null));
    return () => {
      cancelled = true;
    };
  }, [company.id, sessionStatus, user?.id]);

  // The follow that sent the reader off to log in, now they are back and
  // known: the trip finishes the click rather than losing it.
  const buttonRef = usePendingAction<HTMLButtonElement>(
    { kind: 'followCompany', id: company.id },
    isLoggedIn,
    useCallback(() => {
      acted.current = true;
      return api.post<Status>(`/api/companies/${company.id}/follow`).then(setStatus);
    }, [company.id]),
  );

  async function toggle() {
    if (!isLoggedIn) {
      if (sessionStatus === 'ready') {
        // Kept for the way back: logging in follows the company and returns to
        // where the reader was, rather than leaving them to click again.
        savePendingAction({ kind: 'followCompany', id: company.id });
        router.push(authHrefHere());
      }
      return;
    }
    if (busy || !status) return;
    acted.current = true;
    setBusy(true);
    try {
      setStatus(
        status.following
          ? await api.delete<Status>(`/api/companies/${company.id}/follow`)
          : await api.post<Status>(`/api/companies/${company.id}/follow`),
      );
    } finally {
      setBusy(false);
    }
  }

  const followers = status ? status.followerCount : company.followerCount;
  return (
    <span className="flex items-center gap-3">
      {showCount ? <span className="text-sm whitespace-nowrap text-muted">{t('follow.followers', { count: followers })}</span> : null}
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        disabled={busy || (isLoggedIn && !status)}
        title={status?.following ? t('company.unfollowHint', { name: company.name }) : t('company.followHint', { name: company.name })}
        className={`group btn ml-auto rounded-full px-4 py-1.5 ${status?.following ? 'btn-secondary hover:bg-red-500/15 hover:text-danger-soft hover:ring-red-500/30' : 'btn-primary'}`}
      >
        {status?.following ? (
          <>
            <span className="group-hover:hidden">{t('follow.following')}</span>
            <span className="hidden group-hover:inline">{t('follow.unfollow')}</span>
          </>
        ) : (
          t('follow.follow')
        )}
      </button>
    </span>
  );
}

const MOOD_LABELS = { positive: 'comments.moodPositive', mixed: 'comments.moodMixed', negative: 'comments.moodNegative' } as const;
const MOOD_BADGES = {
  positive: 'bg-success/10 text-success ring-success/25',
  mixed: 'bg-raised text-ink ring-line',
  negative: 'bg-danger/10 text-danger ring-danger/25',
};
const TRENDS = {
  warming: { label: 'comments.warming', icon: 'trending-up', className: 'text-success' },
  cooling: { label: 'comments.cooling', icon: 'trending-down', className: 'text-danger' },
  steady: { label: 'comments.steady', icon: null, className: 'text-subtle' },
} as const;

// How the comments on a company's pins read, and which way the newest ones
// lean: the pin page's mood (src/lib/commentMood.ts) over every pin of the
// company at once. Nothing until a comment of theirs has been scored.
function CompanyMood({ mood, commentCount }: { mood: CommentMood; commentCount: number }) {
  const t = useT();
  const trend = mood.trend ? TRENDS[mood.trend] : null;
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
      <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-medium ring-1 ring-inset ${MOOD_BADGES[mood.mood]}`}>
        {t(MOOD_LABELS[mood.mood])}
      </span>
      {trend ? (
        <span className={`inline-flex items-center gap-1 font-medium ${trend.className}`}>
          {trend.icon ? <Icon name={trend.icon} className="size-3.5" /> : null}
          {t(trend.label)}
        </span>
      ) : null}
      <span className="text-subtle" title={t('comments.averageToneTitle', { value: mood.average.toFixed(2) })}>
        {mood.scored < commentCount
          ? t('comments.fromSome', { scored: mood.scored, count: commentCount })
          : t('comments.fromAll', { count: mood.scored })}
      </span>
    </div>
  );
}

// The panel a search for one company opens with: what the company is in a
// line, how its pins are being taken lately, and a Follow button that turns
// its new pins into notifications.
export function SearchedCompanyPanel({ company }: { company: Company }) {
  const t = useT();
  return (
    <div className="floating flex flex-col gap-3.5 px-4 py-3.5">
      {/* What the company is: the name it was searched by, then its blurb
          under it, so the two read as one block. */}
      <div>
        <div className="flex items-center gap-2 font-semibold text-ink">
          {company.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- favicons from arbitrary hosts
            <img src={company.logoUrl} alt="" loading="lazy" referrerPolicy="no-referrer" className="size-6 shrink-0 rounded" />
          ) : null}
          {/* The name itself leads to the article the blurb was taken from. */}
          {company.wikiUrl ? (
            <a
              href={company.wikiUrl}
              target="_blank"
              rel="noreferrer"
              title={t('company.onWikipedia', { name: company.name })}
              className="inline-flex min-w-0 items-center gap-1.5 text-inherit hover:text-link hover:no-underline"
            >
              <span className="truncate">{company.name}</span>
              <Icon name="external" className="size-3.5 shrink-0 opacity-70" />
            </a>
          ) : (
            <span className="min-w-0 truncate">{company.name}</span>
          )}
        </div>
        {company.description ? <p className="mt-2 text-sm leading-relaxed text-muted">{company.description}</p> : null}
      </div>

      {company.mood ? <CompanyMood mood={company.mood} commentCount={company.commentCount} /> : null}

      {/* A search cached before the graph existed has no sentiment on it. */}
      {company.sentiment ? <CompanySentimentChart name={company.name} sentiment={company.sentiment} /> : null}

      {/* Following, under a rule: it acts on the company rather than saying
          anything more about it, and the note belongs with the button. */}
      <div className="border-t border-line pt-3">
        <CompanyFollowButton company={company} showCount />
        <p className="mt-2 text-xs leading-snug text-subtle">{t('company.followExplainer')}</p>
      </div>
    </div>
  );
}
