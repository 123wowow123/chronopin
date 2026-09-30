'use client';

import { useState } from 'react';
import Link from '@/components/ui/Link';
import { Icon } from '@/components/ui/Icon';
import { api } from '@/lib/client/api';
import { useT } from '@/lib/client/i18n';
import type { ChatMessage, ChatUser } from '@/lib/client/messages';
import { useRouter } from '@/lib/client/navigation';
import { listingHref, RATING_TURNS, type ChatListing, type ListingJson, type RatingRole } from '@/lib/listings';
import { ListingView } from './ListingView';
import { ListingCover, listingMoney, listingTitle, Stars } from './parts';
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
  const router = useRouter();
  const [rating, setRating] = useState<ChatListing | null>(null);
  const [viewing, setViewing] = useState<ListingJson | null>(null);
  // The listing being fetched to open, spun on its row meanwhile.
  const [opening, setOpening] = useState<number | null>(null);
  if (!listings.length) return null;

  // The listing's own view over the chat; one taken down since goes to its
  // pin (or the Marketplace map, for one with no pin).
  async function view(listing: ChatListing) {
    if (opening) return;
    setOpening(listing.id);
    try {
      setViewing((await api.get<{ listing: ListingJson }>(`/api/listings/${listing.id}`)).listing);
    } catch {
      router.push(listingHref(listing));
    } finally {
      setOpening(null);
    }
  }
  // The newest listing asked about leads; another is a row under it.
  return (
    <div className="divide-y divide-line border-b border-line">
      {listings.slice(0, 2).map((listing) => {
        const turns = Math.min(turnsNow(listing, messages), RATING_TURNS);
        const role: RatingRole = listing.sellerId === me ? 'buyer' : 'seller';
        return (
          <div key={listing.id} className="flex items-center gap-1.5 px-1.5 py-1">
            <Link
              aria-busy={opening === listing.id}
              href={listingHref(listing)}
              onClick={(event) => {
                // A plain click opens it here; a new-tab click follows the link.
                if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                event.preventDefault();
                void view(listing);
              }}
              // Focus rings the inside: the chat's edges would clip an outline.
              className="group flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-1.5 py-1 text-ink transition-[background-color,transform] duration-150 hover:bg-raised hover:no-underline focus-visible:ring-2 focus-visible:ring-link focus-visible:outline-none focus-visible:ring-inset active:scale-[0.99] active:bg-raised-2"
            >
              <span className="relative size-10 shrink-0 overflow-hidden rounded-md bg-raised ring-1 ring-line">
                <ListingCover photo={listing.photo} video={listing.video} className="transition-transform duration-150 group-hover:scale-105" iconClassName="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{listingTitle(t, listing)}</span>
                <span className="block truncate text-xs text-muted">
                  {listing.price != null ? listingMoney(t, listing.price, listing.currency) : ''}
                  {listing.status !== 'available' ? ` · ${t(`listing.status.${listing.status}`)}` : ''}
                </span>
              </span>
              {opening === listing.id ? (
                <span className="size-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent text-subtle" />
              ) : (
                <Icon name="chevron" className="size-4 shrink-0 -rotate-90 text-subtle rtl:rotate-90 transition-colors group-hover:text-ink" />
              )}
            </Link>
            {listing.myRating ? (
              <button type="button" onClick={() => setRating(listing)} title={t('listing.changeRating')} className="flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-xs text-muted hover:bg-raised">
                <Stars value={listing.myRating.stars} className="size-3" />
                {t('listing.rated')}
              </button>
            ) : turns >= RATING_TURNS ? (
              <button type="button" onClick={() => setRating(listing)} className="btn btn-primary btn-sm me-1.5 shrink-0 rounded-full">
                <Icon name="star" className="size-3.5" />
                {t(role === 'seller' ? 'listing.rateSeller' : 'listing.rateBuyer')}
              </button>
            ) : null}
          </div>
        );
      })}
      {viewing ? <ListingView listing={viewing} onClose={() => setViewing(null)} /> : null}
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
