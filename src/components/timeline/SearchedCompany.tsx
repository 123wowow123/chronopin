'use client';

import Anchor from '@/components/ui/Anchor';
import Link from '@/components/ui/Link';
import { companyPath } from '@/lib/topics';
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
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
export function CompanyFollowButton({
  company,
  showCount,
  info,
  onFollowChange,
}: {
  company: Company;
  showCount?: boolean;
  info?: ReactNode;
  onFollowChange?: (following: boolean) => void;
}) {
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
      return api.post<Status>(`/api/companies/${company.id}/follow`).then((next) => {
        setStatus(next);
        onFollowChange?.(next.following);
      });
    }, [company.id, onFollowChange]),
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
      const next = status.following
        ? await api.delete<Status>(`/api/companies/${company.id}/follow`)
        : await api.post<Status>(`/api/companies/${company.id}/follow`);
      setStatus(next);
      onFollowChange?.(next.following);
    } finally {
      setBusy(false);
    }
  }

  const followers = status ? status.followerCount : company.followerCount;
  return (
    <span className="flex items-center gap-3">
      {showCount ? <span className="text-sm whitespace-nowrap text-muted">{t('follow.followers', { count: followers })}</span> : null}
      {info}
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        disabled={busy || (isLoggedIn && !status)}
        title={status?.following ? t('company.unfollowHint', { name: company.name }) : t('company.followHint', { name: company.name })}
        className={`group btn ms-auto rounded-full px-4 py-1.5 ${status?.following ? 'btn-secondary hover:bg-red-500/15 hover:text-danger-soft hover:ring-red-500/30' : 'btn-primary'}`}
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

// The Wikipedia "W" (simple-icons, CC0), drawn in the surrounding text colour.
function WikipediaMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M12.09 13.119c-.936 1.932-2.217 4.548-2.853 5.728-.616 1.074-1.127.931-1.532.029-1.406-3.321-4.293-9.144-5.651-12.409-.251-.601-.441-.987-.619-1.139-.181-.15-.554-.24-1.122-.271C.103 5.033 0 4.982 0 4.898v-.455l.052-.045c.924-.005 5.401 0 5.401 0l.051.045v.434c0 .119-.075.176-.225.176l-.564.031c-.485.029-.727.164-.727.436 0 .135.053.33.166.601 1.082 2.646 4.818 10.521 4.818 10.521l.136.046 2.411-4.81-.482-1.067-1.658-3.264s-.318-.654-.428-.872c-.728-1.443-.712-1.518-1.447-1.617-.207-.023-.313-.05-.313-.149v-.468l.06-.045h4.292l.113.037v.451c0 .105-.076.15-.227.15l-.308.047c-.792.061-.661.381-.136 1.422l1.582 3.252 1.758-3.504c.293-.64.233-.801.111-.947-.07-.084-.305-.22-.812-.24l-.201-.021c-.052 0-.098-.015-.145-.051-.045-.031-.067-.076-.067-.129v-.427l.061-.045c1.247-.008 4.043 0 4.043 0l.059.045v.436c0 .121-.059.178-.193.178-.646.03-.782.095-1.023.439-.12.186-.375.589-.646 1.039l-2.301 4.273-.065.135 2.792 5.712.17.048 4.396-10.438c.154-.422.129-.722-.064-.895-.197-.172-.346-.273-.857-.295l-.42-.016c-.061 0-.105-.014-.152-.045-.043-.029-.072-.075-.072-.119v-.436l.059-.045h4.961l.041.045v.437c0 .119-.074.18-.209.18-.648.03-1.127.18-1.443.421-.314.255-.557.616-.736 1.067 0 0-4.043 9.258-5.426 12.339-.525 1.007-1.053.917-1.503-.031-.571-1.171-1.773-3.786-2.646-5.71l.053-.036z" />
    </svg>
  );
}

// The panel a search for one company opens with: what the company is in a
// line, how its pins are being taken lately, and a Follow button that turns
// its new pins into notifications.
export function SearchedCompanyPanel({
  company,
  onFollowChange,
}: {
  company: Company;
  onFollowChange?: (following: boolean) => void;
}) {
  const t = useT();
  const [explaining, setExplaining] = useState(false);
  const explainId = useId();
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
          {/* The name leads to the company's landing page; the article the
              blurb was taken from sits at the far end as a Wikipedia mark. */}
          <Link href={companyPath(company.name)} className="min-w-0 truncate text-inherit hover:text-link hover:no-underline">
            {company.name}
          </Link>
          {company.wikiUrl ? (
            <Anchor
              href={company.wikiUrl}
              target="_blank"
              rel="noreferrer"
              title={t('company.onWikipedia', { name: company.name })}
              aria-label={t('company.onWikipedia', { name: company.name })}
              className="ms-auto inline-flex size-6 shrink-0 items-center justify-center rounded-full text-muted ring-1 ring-line ring-inset hover:bg-raised hover:text-ink hover:no-underline"
            >
              <WikipediaMark className="size-3.5" />
            </Anchor>
          ) : null}
        </div>
        {company.description ? <p className="mt-2 text-sm leading-relaxed text-muted">{company.description}</p> : null}
      </div>

      {company.mood ? <CompanyMood mood={company.mood} commentCount={company.commentCount} /> : null}

      {/* A search cached before the graph existed has no sentiment on it. */}
      {company.sentiment ? <CompanySentimentChart name={company.name} sentiment={company.sentiment} /> : null}

      {/* Following, under a rule: it acts on the company rather than saying
          anything more about it. What following does sits behind an info
          toggle, the way the sentiment graph's explanation does. */}
      <div className="border-t border-line pt-3">
        <CompanyFollowButton
          company={company}
          showCount
          onFollowChange={onFollowChange}
          info={
            <button
              type="button"
              onClick={() => setExplaining(!explaining)}
              aria-expanded={explaining}
              aria-controls={explainId}
              aria-label={t('company.followAbout')}
              title={t('company.followAbout')}
              className={`-my-1 -ms-2 rounded-full p-1 hover:bg-raised hover:text-ink ${explaining ? 'text-link' : 'text-subtle'}`}
            >
              <Icon name="info" className="size-3.5" />
            </button>
          }
        />
        {explaining ? (
          <p id={explainId} className="mt-2 text-xs leading-snug text-subtle">
            {t('company.followExplainer')}
          </p>
        ) : null}
      </div>
    </div>
  );
}
