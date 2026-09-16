import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { JsonLd } from '@/components/JsonLd';
import { Comments } from '@/components/pin/Comments';
import { CountdownMeter } from '@/components/pin/CountdownMeter';
import { CitedText } from '@/components/pin/CitedText';
import { DateConfidence, DateConfidenceReasoning } from '@/components/pin/DateConfidence';
import { DateRanges } from '@/components/pin/DateRanges';
import { FollowButton } from '@/components/pin/FollowButton';
import { PinAdminLink } from '@/components/pin/PinAdminLink';
import { CARD_GRID } from '@/components/pin/cardGrid';
import { PinCard } from '@/components/pin/PinCard';
import { PinConfidence } from '@/components/pin/PinConfidence';
import { PinDuplicates } from '@/components/pin/PinDuplicates';
import { PinViewTracker } from '@/components/pin/PinViewTracker';
import { PinRatings } from '@/components/pin/PinRatings';
import { PinReferences } from '@/components/pin/PinReferences';
import { PinMapLoader } from '@/components/pin/PinMapLoader';
import { PinMediaFrame } from '@/components/pin/PinMedia';
import { PinWeather } from '@/components/pin/PinWeather';
import { RefineLink } from '@/components/pin/RefineLink';
import { WatchButton } from '@/components/pin/WatchButton';
import { Icon } from '@/components/ui/Icon';
import { PostedTime, StartTime } from '@/components/ui/LocalTime';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { pinDateRanges } from '@/lib/dateClaims';
import { dayKeyIn, money } from '@/lib/format';
import { pinEvidence } from '@/lib/referenceConfidence';
import { safeCitedHtml, safeHtml, toCardPins } from '@/lib/sanitize';
import { pinJsonLd, pinMetadata, pinPath } from '@/lib/seo';
import { pinTense } from '@/lib/timeline';
import type { PinJson } from '@/lib/types';
import { duplicateGroupPins, pinById, pinComments, relatedPins, threadPins } from '@/server/services/pages';
import { viewerTimeZone } from '@/server/viewer';

// src/proxy.ts sends the real 308s and 404s for pin URLs before this renders.
type Props = PageProps<'/pin/[id]/[slug]'>;

async function loadPin(params: Props['params']) {
  const { id: rawId } = await params;
  const id = Number(rawId);
  return Number.isInteger(id) && id > 0 ? pinById(id) : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const pin = await loadPin(params);
  return pin ? pinMetadata(pin) : { title: 'Pin not found', robots: { index: false } };
}

export default function PinPage({ params }: Props) {
  return (
    <main className="mx-auto max-w-7xl px-4 pt-6 pb-20 sm:px-6">
      <Suspense fallback={<div className="h-[70vh] animate-pulse rounded-xl bg-panel" aria-busy="true" />}>
        <PinContent params={params} />
      </Suspense>
    </main>
  );
}

async function PinContent({ params }: Pick<Props, 'params'>) {
  // The slug was already checked (and redirected) by src/proxy.ts.
  const pin = await loadPin(params);
  if (!pin) {
    notFound();
  }

  return (
    <>
      <JsonLd data={pinJsonLd(pin)} />
      <PinViewTracker pinId={pin.id} />
      {/* grid-cols-[minmax(0,1fr)]: the single column below lg is otherwise
          floored by its content's min-width, which scrolls the page sideways. */}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-10">
        <article>
          <PinBodyForViewer pin={pin} />
        </article>

        <aside className="min-w-0">
          {pin.latitude != null && pin.longitude != null ? (
            <div>
              <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                {pin.address ? (
                  <p className="flex min-w-0 items-center gap-1.5 text-muted">
                    <Icon name="pin" className="size-4 shrink-0" />
                    {pin.address}
                  </p>
                ) : (
                  <span />
                )}
                <Link href={`/map?pin=${pin.id}`} className="flex shrink-0 items-center gap-1.5 text-link">
                  <Icon name="map" className="size-4" />
                  Show on map
                </Link>
              </div>
              <PinMapLoader latitude={pin.latitude} longitude={pin.longitude} title={pin.title} />
              <PinWeather pinId={pin.id} />
            </div>
          ) : null}

          <Suspense fallback={null}>
            <Duplicates pin={pin} />
          </Suspense>

          <Suspense fallback={null}>
            <Thread pin={pin} />
          </Suspense>

          <Suspense fallback={<Comments pinId={pin.id} initialComments={[]} />}>
            <PinCommentsSection pinId={pin.id} />
          </Suspense>
        </aside>
      </div>

      <Suspense fallback={null}>
        <Related pin={pin} />
      </Suspense>
    </>
  );
}

async function PinBodyForViewer({ pin }: { pin: PinJson }) {
  return <PinBody pin={pin} timeZone={await viewerTimeZone()} />;
}

function PinBody({ pin, timeZone }: { pin: PinJson; timeZone: string }) {
  const media = pin.media ?? [];
  const hasCoordinates = pin.latitude != null && pin.longitude != null;
  const company = pin.company ? (
    <a
      href={pin.companyWikiUrl || undefined}
      target="_blank"
      rel="noopener"
      className="inline-flex items-center gap-1 text-inherit hover:no-underline"
      title={pin.companyWikiUrl ? `${pin.company} on Wikipedia` : undefined}
    >
      {pin.companyLogoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- favicons from arbitrary hosts
        <img src={pin.companyLogoUrl} alt="" loading="lazy" referrerPolicy="no-referrer" className="size-3.5 rounded-sm" />
      ) : null}
      {pin.company}
    </a>
  ) : null;
  const dateRanges = pinDateRanges(pin, timeZone);
  // The map labels the place itself; the text is only for an address it cannot draw.
  const locationText = pin.address && !hasCoordinates ? pin.address : null;

  // Company and place as plain text, for a pin without a medium to label.
  const placeRow =
    company || locationText ? (
      <div className="mb-2 flex flex-wrap gap-x-3 text-sm text-muted">
        {company}
        {locationText ? <span>{locationText}</span> : null}
      </div>
    ) : null;

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center text-xs text-subtle">
        {pin.category ? (
          <>
            <RefineLink field="category" value={pin.category} className="rounded-full bg-raised px-2.5 py-0.5 font-medium text-muted ring-1 ring-line ring-inset hover:text-ink hover:no-underline">
              {pin.category}
            </RefineLink>
            <span className="px-1" />
          </>
        ) : null}
        {pin.utcCreatedDateTime ? (
          <span>
            Posted <PostedTime value={pin.utcCreatedDateTime} serverTimeZone={timeZone} />
          </span>
        ) : null}
        {pin.user?.userName ? (
          <>
            <span className="px-1.5 text-faint" aria-hidden>·</span>
            <RefineLink field="user" value={pin.user.userName} className="text-inherit hover:text-ink hover:no-underline">
              {pin.user.userName}
            </RefineLink>
          </>
        ) : null}
      </div>

      {media.length ? (
        <PinMediaFrame
          className="relative mb-4 overflow-hidden rounded-xl border border-line bg-black"
          overlay={
            <>
              {locationText ? <span className="media-chip absolute top-3 right-3 z-10">{locationText}</span> : null}
              {company ? <span className="media-chip absolute bottom-3 left-3 z-10">{company}</span> : null}
            </>
          }
          fallback={placeRow}
          media={media}
          title={pin.title}
          href={pin.sourceUrl}
          external
          selectable
          priority
          sizes="(max-width: 1024px) 100vw, 50vw"
        />
      ) : (
        placeRow
      )}

      {pin.utcStartDateTime ? (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
          <StartTime pin={pin} serverTimeZone={timeZone} allDaySuffix />
          <DateConfidence level={pin.dateConfidence} reasoning={pin.dateConfidenceReasoning} />
          <PinConfidence evidence={pinEvidence(pin)} />
          {/* Last: the reasoning takes a line of its own below the badges. */}
          <DateConfidenceReasoning reasoning={pin.dateConfidenceReasoning}>
            {pin.dateConfidenceReasoning ? <CitedText text={pin.dateConfidenceReasoning} evidence={pinEvidence(pin)} /> : undefined}
          </DateConfidenceReasoning>
        </div>
      ) : null}
      {pin.utcStartDateTime ? <DateRanges {...dateRanges} /> : null}

      {pin.utcStartDateTime ? <CountdownMeter start={pin.utcStartDateTime} since={pin.utcCreatedDateTime} allDay={pin.allDay} /> : null}

      <h1 className="mt-3 mb-4 flex items-start gap-2 text-3xl leading-tight font-semibold tracking-tight text-pretty">
        {pin.sourceUrl ? (
          <>
            <a href={pin.sourceUrl} target="_blank" rel="noopener" className="text-ink transition-colors hover:text-link hover:no-underline">
              {pin.title}
            </a>
            <a href={pin.sourceUrl} target="_blank" rel="noopener" aria-label="Open the source" className="flex h-[1lh] shrink-0 items-center text-subtle hover:text-link">
              <Icon name="external" className="size-4" />
            </a>
          </>
        ) : (
          pin.title
        )}
      </h1>

      <PinRatings ratings={pin.ratings} />

      {pin.description ? <div className="rich-text mb-3 text-base leading-relaxed font-medium text-ink" dangerouslySetInnerHTML={{ __html: safeHtml(pin.description) }} /> : null}
      {pin.longFormSummary ? <div className="rich-text text-[15px] leading-relaxed text-ink/90" dangerouslySetInnerHTML={{ __html: safeCitedHtml(pin.longFormSummary, pinEvidence(pin)) }} /> : null}

      {pin.user?.id && pin.user.userName ? (
        <div className="surface mt-6 flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <RefineLink field="user" value={pin.user.userName} className="flex items-center gap-2 font-semibold text-ink hover:no-underline">
            <UserAvatar userName={pin.user.userName} pictureUrl={pin.user.pictureUrl} className="size-9 text-sm" />
            {pin.user.userName}
          </RefineLink>
          <FollowButton userId={pin.user.id} userName={pin.user.userName} showCount />
        </div>
      ) : null}

      <div className="flex items-center justify-between py-3">
        <div className={pin.price != null && pin.price < 0 ? 'text-danger' : ''}>
          {pin.price ? (
            <>
              <span className="text-subtle">Cost</span> <span className="font-semibold text-success tabular-nums">{money(pin.price, pin.priceCurrency)}</span>
            </>
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          <WatchButton pin={pin} loadForViewer />
          <PinAdminLink pinId={pin.id} />
        </div>
      </div>

      {pin.merchants?.some((m) => m.url) ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {pin.merchants
            .filter((m) => m.url)
            .map((merchant, index) => (
              <a
                key={merchant.id ?? index}
                href={merchant.url}
                target="_blank"
                rel="noopener nofollow sponsored"
                className={`btn ${
                  merchant.label === 'Amazon' ? 'bg-[#ff9900] text-black hover:bg-[#ffad33]' : merchant.label === 'Best Buy' ? 'bg-[#0046be] text-white hover:bg-[#1257d1]' : 'btn-secondary'
                }`}
              >
                <Icon name={merchant.label === 'Best Buy' ? 'tag' : 'cart'} className="size-4" />
                {merchant.label === 'Amazon' ? 'Buy on Amazon' : merchant.label === 'Best Buy' ? 'Buy at Best Buy' : merchant.label}
                {merchant.price ? <span className="font-normal">{money(merchant.price)}</span> : null}
                <Icon name="external" className="size-3.5 opacity-70" />
              </a>
            ))}
        </div>
      ) : null}

      <PinReferences pinId={pin.id} authorId={pin.user?.id ?? pin.userId} evidence={pinEvidence(pin)} sourceReasoning={pin.dateConfidenceReasoning} dateRanges={dateRanges} timeZone={timeZone} />
    </>
  );
}

async function Thread({ pin }: { pin: PinJson }) {
  const pins = await threadPins(pin.id);
  return (
    <section aria-labelledby="thread-heading" className="surface mt-6 p-5">
      <div className="flex items-baseline justify-between">
        <h2 id="thread-heading" className="text-base font-semibold">
          Thread
        </h2>
        <Link href={`/respond/${pin.id}`} className="text-sm" prefetch={false}>
          Respond to this Pin
        </Link>
      </div>
      <ol className="mt-3 space-y-1">
        {pins.map((p, index) => (
          <li key={p.id}>
            <Link
              href={pinPath(p)}
              aria-current={p.id === pin.id ? 'page' : undefined}
              className={`flex gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-ink hover:no-underline ${p.id === pin.id ? 'bg-raised ring-1 ring-line ring-inset' : 'hover:bg-raised/60'}`}
            >
              <span className="w-4 shrink-0 text-right text-subtle tabular-nums">{index + 1}</span>
              {p.title}
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

// The same event pinned by others, plus (for an admin or an author) the
// app's duplicate suggestions to review. Renders nothing when there are none.
async function Duplicates({ pin }: { pin: PinJson }) {
  const [group, timeZone] = await Promise.all([pin.duplicateGroup?.length ? duplicateGroupPins(pin.id, pin.duplicateGroup) : [], viewerTimeZone()]);
  return <PinDuplicates pinId={pin.id} group={group} timeZone={timeZone} />;
}

async function PinCommentsSection({ pinId }: { pinId: number }) {
  return <Comments pinId={pinId} initialComments={await pinComments(pinId)} />;
}

async function Related({ pin }: { pin: PinJson }) {
  const [pins, timeZone] = await Promise.all([relatedPins(pin.id, pin.title), viewerTimeZone()]);
  if (!pins.length) {
    return null;
  }
  const now = new Date();
  const todayKey = dayKeyIn(now, timeZone);
  return (
    <section aria-labelledby="related-heading" className="mt-16 border-t border-line pt-10">
      <h2 id="related-heading" className="mb-4 text-xl font-semibold tracking-tight">
        More like this
      </h2>
      <ul className={CARD_GRID}>
        {toCardPins(pins).map((p) => (
          <li key={p.id}>
            <PinCard pin={p} serverTimeZone={timeZone} tense={pinTense(p, now, todayKey)} />
          </li>
        ))}
      </ul>
    </section>
  );
}
