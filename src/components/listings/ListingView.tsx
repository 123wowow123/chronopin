'use client';

import { useState } from 'react';
import Link from '@/components/ui/Link';
import { Icon } from '@/components/ui/Icon';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { useStartChat } from '@/components/messages/Messenger';
import { api, ApiError, isEmailUnverified } from '@/lib/client/api';
import { useT } from '@/lib/client/i18n';
import { useRouter } from '@/lib/client/navigation';
import { authHrefHere } from '@/lib/client/returnSpot';
import { useNow } from '@/lib/client/now';
import { useSession } from '@/lib/client/session';
import { timeAgo } from '@/lib/format';
import type { ListingJson } from '@/lib/listings';
import { ListingFacts } from './ListingForm';
import { Dialog, listingTitle, mediaUrl, priceLine, RatingBadge } from './parts';

// Listings asked about from this page since it loaded, as viewer:listing.
const askedHere = new Set<string>();

// One listing as a buyer sees it: its photos and video, what it is, where,
// who sells it and how they are rated, and a first message to the seller
// that opens the chat about it - or, once asked, a way back to that chat.
// The seller sees Edit instead.
export function ListingView({ listing, onClose, onEdit }: { listing: ListingJson; onClose: () => void; onEdit?: () => void }) {
  const t = useT();
  const router = useRouter();
  const { user, isLoggedIn } = useSession();
  const startChat = useStartChat();
  const media = [...listing.photos.map((name) => ({ name, video: false })), ...(listing.video ? [{ name: listing.video, video: true }] : [])];
  const [shown, setShown] = useState(0);
  const [draft, setDraft] = useState(t('listing.askDefault'));
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const mine = user?.id === listing.seller.id;
  const title = listingTitle(t, listing);
  const current = media[shown];
  const now = useNow(60_000);
  // A chat the viewer is in has asked about it: the server's word, or a
  // question sent from a view since (the list the view came from is older).
  const asked = !!listing.asked || askedHere.has(`${user?.id}:${listing.id}`);

  function continueChat() {
    onClose();
    startChat(listing.seller);
  }

  async function ask() {
    const body = draft.trim();
    if (!body) return;
    setSending(true);
    setError('');
    try {
      await api.post(`/api/messages/${listing.seller.id}`, { body, listingId: listing.id });
      askedHere.add(`${user?.id}:${listing.id}`);
      onClose();
      startChat(listing.seller);
    } catch (err) {
      setError(
        isEmailUnverified(err)
          ? t('dm.verifyFirst')
          : err instanceof ApiError && err.status === 403
            ? t('dm.blocked')
            : err instanceof ApiError && err.status === 422
              ? t('listing.noLongerOffered')
              : t('dm.actionFailed'),
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog label={title} onClose={onClose} className="w-full max-w-5xl" bare>
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)] overflow-y-auto md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] md:overflow-hidden">
        <div className="flex min-h-0 flex-col bg-black">
          <div dir="ltr" className="relative flex min-h-64 flex-1 items-center justify-center">
            {current ? (
              current.video ? (
                <video key={current.name} src={mediaUrl(current.name)} controls playsInline className="max-h-[70dvh] max-w-full" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element -- the seller's upload
                <img src={mediaUrl(current.name)} alt={title} className="max-h-[70dvh] max-w-full object-contain" />
              )
            ) : (
              <Icon name="cart" className="size-16 text-white/30" />
            )}
            {media.length > 1 ? (
              <>
                <button
                  type="button"
                  onClick={() => setShown((shown - 1 + media.length) % media.length)}
                  aria-label={t('listing.previousPhoto')}
                  className="absolute start-3 flex size-10 items-center justify-center rounded-full bg-white/85 text-black shadow hover:bg-white"
                >
                  <Icon name="chevron" className="size-5 rotate-90" />
                </button>
                <button
                  type="button"
                  onClick={() => setShown((shown + 1) % media.length)}
                  aria-label={t('listing.nextPhoto')}
                  className="absolute end-3 flex size-10 items-center justify-center rounded-full bg-white/85 text-black shadow hover:bg-white"
                >
                  <Icon name="chevron" className="size-5 -rotate-90" />
                </button>
              </>
            ) : null}
          </div>
          {media.length > 1 ? (
            <div className="flex gap-1.5 overflow-x-auto p-2">
              {media.map((m, i) => (
                <button
                  key={m.name}
                  type="button"
                  onClick={() => setShown(i)}
                  aria-label={t('listing.photoN', { n: i + 1 })}
                  aria-current={i === shown}
                  className={`relative size-14 shrink-0 overflow-hidden rounded-md ring-2 ${i === shown ? 'ring-white' : 'ring-transparent opacity-60 hover:opacity-100'}`}
                >
                  {m.video ? (
                    <Icon name="play" className="absolute inset-0 m-auto size-6 fill-current text-white" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element -- the seller's upload
                    <img src={mediaUrl(m.name)} alt="" className="size-full object-cover" />
                  )}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="min-h-0 space-y-4 p-4 pt-14 md:overflow-y-auto">
          <div>
            <h2 className="text-2xl font-bold text-ink">{title}</h2>
            <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <span className="text-lg font-semibold text-ink">{priceLine(t, listing)}</span>
              {listing.status === 'pending' ? <span className="rounded-full bg-warning/15 px-2.5 py-0.5 text-xs font-semibold text-warning">{t('listing.status.pending')}</span> : null}
            </p>
            <p className="mt-1 text-xs text-subtle">
              {listing.location?.name
                ? t('listing.listedAgoIn', { ago: timeAgo(listing.utcCreatedDateTime, now, t.locale), place: listing.location.name })
                : t('listing.listedAgo', { ago: timeAgo(listing.utcCreatedDateTime, now, t.locale) })}
            </p>
          </div>

          <div>
            <p className="mb-2 font-semibold text-ink">{t(`listing.about.${listing.kind}`)}</p>
            <ListingFacts t={t} kind={listing.kind} details={listing.details} />
          </div>

          {listing.description ? (
            <div>
              <p className="mb-1 font-semibold text-ink">{t(listing.kind === 'job' ? 'listing.jobDetails' : 'listing.sellerDescription')}</p>
              <p className="text-sm whitespace-pre-wrap text-ink">{listing.description}</p>
            </div>
          ) : null}

          {listing.location?.name ? (
            <p className="flex items-center gap-1.5 text-sm text-muted">
              <Icon name="pin" className="size-4 text-subtle" />
              <span className="font-medium text-ink">{listing.location.name}</span> · {t('listing.approximate')}
            </p>
          ) : null}

          <div className="border-t border-line pt-3">
            <p className="mb-2 font-semibold text-muted">{t(listing.kind === 'job' ? 'listing.aboutPoster' : 'listing.sellerInformation')}</p>
            <div className="flex items-center gap-3">
              <UserAvatar userName={listing.seller.userName} pictureUrl={listing.seller.pictureUrl} className="size-11 text-sm" />
              <div className="min-w-0">
                <div className="truncate font-semibold text-ink">{listing.seller.userName}</div>
                <RatingBadge rating={listing.sellerRating} />
              </div>
            </div>
          </div>

          {mine ? (
            <div className="surface space-y-2 p-3">
              <p className="text-sm text-muted">{t('listing.yours')}</p>
              <div className="flex flex-wrap gap-2">
                {onEdit ? (
                  <button type="button" onClick={onEdit} className="btn btn-secondary">
                    <Icon name="pencil" className="size-4" />
                    {t('listing.edit')}
                  </button>
                ) : null}
                <Link href="/listings" className="btn btn-ghost">
                  {t('listing.manage')}
                </Link>
              </div>
            </div>
          ) : isLoggedIn && asked ? (
            // Already asked: the first-message box, greyed, and a press on it
            // opens that chat to carry on.
            <button
              type="button"
              onClick={continueChat}
              className="surface group block w-full space-y-2 p-3 text-start transition-colors hover:bg-raised focus-visible:ring-2 focus-visible:ring-link focus-visible:outline-none focus-visible:ring-inset active:bg-raised-2"
            >
              <span className="flex items-center gap-2 font-semibold text-muted">
                <Icon name="message" className="size-4 text-subtle" />
                {t(listing.kind === 'job' ? 'listing.askPoster' : 'listing.askSeller')}
              </span>
              <span className="block text-sm text-subtle">{t('listing.alreadyAsked')}</span>
              <span className="btn btn-primary w-full">
                <Icon name="message" className="size-4" />
                {t('listing.continueChat')}
              </span>
            </button>
          ) : (
            <div className="surface space-y-2 p-3">
              <p className="flex items-center gap-2 font-semibold text-ink">
                <Icon name="message" className="size-4 text-accent" />
                {t(listing.kind === 'job' ? 'listing.askPoster' : 'listing.askSeller')}
              </p>
              {isLoggedIn ? (
                <>
                  <textarea
                    aria-label={t('listing.askSeller')}
                    rows={2}
                    maxLength={4000}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    className="field resize-none text-sm"
                  />
                  {error ? (
                    <p role="alert" className="text-xs text-danger">
                      {error}
                    </p>
                  ) : null}
                  <button type="button" onClick={() => void ask()} disabled={sending || !draft.trim()} className="btn btn-primary w-full">
                    {t('dm.send')}
                  </button>
                </>
              ) : (
                <button type="button" onClick={() => router.push(authHrefHere())} className="btn btn-primary w-full">
                  {t('listing.logInToAsk')}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
}
