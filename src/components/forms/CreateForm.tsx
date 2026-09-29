'use client';

import { ListingForm } from '@/components/listings/ListingForm';
import { Icon, type IconName } from '@/components/ui/Icon';
import { useT } from '@/lib/client/i18n';
import { useRouter, useSearchParams } from '@/lib/client/navigation';
import { LISTING_KINDS, listingHref, type ListingKind } from '@/lib/listings';
import { QuickPinForm } from './QuickPinForm';

const KIND_ICONS: Record<ListingKind, IconName> = { item: 'tag', vehicle: 'car', home: 'home', job: 'briefcase' };

const PICKER = '/create?type=listing';
const kindHref = (kind: ListingKind) => `${PICKER}&kind=${kind}`;

// Whether the kind's form was opened from the picker in this tab, so Back
// can step back to it rather than add it to the history again.
let pickedHere = false;

// /create: a pin from a link, or (?type=listing) a Marketplace listing on its
// own - an item, a vehicle, a home or a job - with no news pin behind it;
// &kind= is the form for the kind picked, on a page of its own. Both come
// from the URL on every render: pages stay mounted while hidden (React
// Activity), so a link can land on this one already open.
export function CreateForm() {
  const params = useSearchParams();
  const kind = params.get('kind') as ListingKind | null;
  if (params.get('type') !== 'listing') return <QuickPinForm tabs={<CreateTabs listing={false} />} />;
  if (kind && LISTING_KINDS.includes(kind)) return <ListingPage key={kind} kind={kind} />;
  return <ListingTypes />;
}

function CreateTabs({ listing }: { listing: boolean }) {
  const t = useT();
  const router = useRouter();
  return (
    <div role="group" aria-label={t('quickPin.whatToCreate')} className="inline-flex items-center gap-1 rounded-full bg-raised p-1 text-sm ring-1 ring-line">
      {([false, true] as const).map((forListing) => (
        <button
          key={String(forListing)}
          type="button"
          aria-pressed={listing === forListing}
          onClick={() => router.replace(forListing ? PICKER : '/create')}
          className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 font-medium ${listing === forListing ? 'bg-accent text-white' : 'text-muted hover:text-ink'}`}
        >
          <Icon name={forListing ? 'cart' : 'pin'} className="size-4" />
          {forListing ? t('quickPin.tabListing') : t('quickPin.tabPin')}
        </button>
      ))}
    </div>
  );
}

// "Choose listing type", as Marketplace starts one: each kind opens its form.
function ListingTypes() {
  const t = useT();
  const router = useRouter();
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <h1 className="text-2xl font-semibold tracking-tight">{t('listing.newListing')}</h1>
        <CreateTabs listing />
      </div>
      <p className="mt-2 text-sm text-subtle">{t('listing.newLede')}</p>
      <h2 className="mt-6 mb-3 text-sm font-semibold text-muted">{t('listing.chooseType')}</h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {LISTING_KINDS.map((k) => (
          <li key={k}>
            <button
              type="button"
              onClick={() => {
                pickedHere = true;
                router.push(kindHref(k));
              }}
              className="surface flex h-full w-full items-start gap-3 p-4 text-left transition-colors hover:bg-raised"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
                <Icon name={KIND_ICONS[k]} className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="block font-semibold text-ink">{t(`listing.kinds.${k}`)}</span>
                <span className="block text-sm text-subtle">{t(`listing.typeHints.${k}`)}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// The kind's form as a page, as a pin is posted: Back returns to the types,
// and the listing published opens on the Marketplace map in its place.
function ListingPage({ kind }: { kind: ListingKind }) {
  const t = useT();
  const router = useRouter();
  const back = () => {
    if (pickedHere) {
      pickedHere = false;
      router.back();
    } else router.replace(PICKER);
  };
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <button type="button" onClick={back} className="mb-4 inline-flex items-center gap-1.5 rounded-full px-2 py-1 -ml-2 text-sm font-medium text-muted hover:bg-raised hover:text-ink">
        <Icon name="back" className="size-4" />
        {t('common.back')}
      </button>
      <ListingForm
        page
        pinId={null}
        kind={kind}
        onClose={back}
        onSaved={(saved) => {
          pickedHere = false;
          router.replace(listingHref(saved));
        }}
      />
    </div>
  );
}
