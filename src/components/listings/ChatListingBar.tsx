'use client';

import { useState } from 'react';
import Link from '@/components/ui/Link';
import { Icon } from '@/components/ui/Icon';
import { useT } from '@/lib/client/i18n';
import type { ChatMessage, ChatUser } from '@/lib/client/messages';
import { RATING_TURNS, type ChatListing, type RatingRole } from '@/lib/listings';
import { listingMoney, listingTitle, mediaUrl, Stars } from './parts';
import { RateDialog } from './RateDialog';

// Turns so far: the server's count up to the page it sent, then any newer
// messages this chat has taken since, a new turn at each change of sender.
function turnsNow(listing: ChatListing, messages: ChatMessage[]) {
  let turns = listing.turns;
  let last = listing.lastSenderId;
  for (const m of messages) {
    if (m.id <= listing.throughMessageId || m.unsent) continue;
    if (m.senderId !== last) turns++;
    last = m.senderId;
  }
  return turns;
}

// Over a chat about a listing: what is being sold, and - once the two have
// gone back and forth RATING_TURNS times - the button to rate the other side.
export function ChatListingBar({
  listings,
  messages,
  me,
  other,
  onRated,
}: {
  listings: ChatListing[];
  messages: ChatMessage[];
  me: number;
  other: ChatUser;
  onRated: (listingId: number, rating: ChatListing['myRating']) => void;
}) {
  const t = useT();
  const [rating, setRating] = useState<ChatListing | null>(null);
  if (!listings.length) return null;
  // The newest listing asked about leads; another is a row under it.
  return (
    <div className="divide-y divide-line border-b border-line">
      {listings.slice(0, 2).map((listing) => {
        const turns = Math.min(turnsNow(listing, messages), RATING_TURNS);
        const role: RatingRole = listing.sellerId === me ? 'buyer' : 'seller';
        return (
          <div key={listing.id} className="flex items-center gap-2.5 px-3 py-2">
            <Link href={`/pin/${listing.pinId}?listing=${listing.id}`} className="flex min-w-0 flex-1 items-center gap-2.5 text-ink hover:no-underline">
              <span className="relative size-10 shrink-0 overflow-hidden rounded-md bg-raised">
                {listing.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element -- the seller's upload
                  <img src={mediaUrl(listing.photo)} alt="" className="size-full object-cover" />
                ) : (
                  <Icon name="tag" className="absolute inset-0 m-auto size-5 text-subtle" />
                )}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">{listingTitle(t, listing)}</span>
                <span className="block truncate text-xs text-muted">
                  {listing.price != null ? listingMoney(t, listing.price, listing.currency) : ''}
                  {listing.status !== 'available' ? ` · ${t(`listing.status.${listing.status}`)}` : ''}
                </span>
              </span>
            </Link>
            {listing.myRating ? (
              <button type="button" onClick={() => setRating(listing)} title={t('listing.changeRating')} className="flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-xs text-muted hover:bg-raised">
                <Stars value={listing.myRating.stars} className="size-3" />
                {t('listing.rated')}
              </button>
            ) : turns >= RATING_TURNS ? (
              <button type="button" onClick={() => setRating(listing)} className="btn btn-primary btn-sm shrink-0 rounded-full">
                <Icon name="star" className="size-3.5" />
                {t(role === 'seller' ? 'listing.rateSeller' : 'listing.rateBuyer')}
              </button>
            ) : (
              <span className="shrink-0 text-right text-[11px] leading-tight text-subtle" title={t('listing.rateAfterHint', { turns: RATING_TURNS })}>
                {t('listing.rateAfter', { turns, total: RATING_TURNS })}
              </span>
            )}
          </div>
        );
      })}
      {rating ? (
        <RateDialog
          listingId={rating.id}
          user={other}
          role={rating.sellerId === me ? 'buyer' : 'seller'}
          initial={rating.myRating}
          onClose={() => setRating(null)}
          onRated={(given) => {
            onRated(rating.id, given);
            setRating(null);
          }}
        />
      ) : null}
    </div>
  );
}
