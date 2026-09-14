import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { JsonLd } from '@/components/JsonLd';
import { Comments } from '@/components/pin/Comments';
import { CountdownMeter } from '@/components/pin/CountdownMeter';
import { DateConfidence } from '@/components/pin/DateConfidence';
import { FollowButton } from '@/components/pin/FollowButton';
import { PinAdminLink } from '@/components/pin/PinAdminLink';
import { PinCard } from '@/components/pin/PinCard';
import { PinMapLoader } from '@/components/pin/PinMapLoader';
import { PinMedia } from '@/components/pin/PinMedia';
import { PinWeather } from '@/components/pin/PinWeather';
import { RefineLink } from '@/components/pin/RefineLink';
import { WatchButton } from '@/components/pin/WatchButton';
import { Icon } from '@/components/ui/Icon';
import { PostedTime, StartTime } from '@/components/ui/LocalTime';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { money } from '@/lib/format';
import { safeHtml, toCardPins } from '@/lib/sanitize';
import { pinJsonLd, pinMetadata, pinPath } from '@/lib/seo';
import type { PinJson } from '@/lib/types';
import { pinById, pinComments, relatedPins, threadPins } from '@/server/services/pages';
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
    <main className="px-3 pt-4 pb-16 sm:px-6">
      <Suspense fallback={<div className="h-[70vh] animate-pulse rounded bg-panel" aria-busy="true" />}>
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
      <div className="grid gap-8 lg:grid-cols-2">
        <article>
          <PinBodyForViewer pin={pin} />
        </article>

        <aside className="min-w-0">
          {pin.latitude != null && pin.longitude != null ? (
            <div>
              {pin.address ? (
                <p className="mb-1 flex items-center gap-1 text-sm text-muted">
                  <Icon name="pin" className="size-4" />
                  {pin.address}
                </p>
              ) : null}
              <PinMapLoader latitude={pin.latitude} longitude={pin.longitude} title={pin.title} />
              <PinWeather pinId={pin.id} />
            </div>
          ) : null}

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
  const medium = pin.media?.[0];
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
  // The map labels the place itself; the text is only for an address it cannot draw.
  const locationText = pin.address && !hasCoordinates ? pin.address : null;

  return (
    <>
      <div className="mb-1 flex flex-wrap items-center text-[11px] text-muted">
        {pin.category ? (
          <>
            <RefineLink field="category" value={pin.category} className="text-inherit hover:no-underline">
              {pin.category}
            </RefineLink>
            <span className="px-1">/</span>
          </>
        ) : null}
        {pin.utcCreatedDateTime ? (
          <span>
            Posted <PostedTime value={pin.utcCreatedDateTime} serverTimeZone={timeZone} />
          </span>
        ) : null}
        {pin.user?.userName ? (
          <>
            <span className="px-1">/</span>
            <RefineLink field="user" value={pin.user.userName} className="text-inherit hover:no-underline">
              {pin.user.userName}
            </RefineLink>
          </>
        ) : null}
      </div>

      {medium ? (
        <div className="relative mb-3 overflow-hidden rounded">
          {locationText ? (
            <span className="absolute top-2 right-2 z-10 rounded-full bg-black/70 px-2 py-0.5 text-xs text-white">{locationText}</span>
          ) : null}
          {company ? <span className="absolute bottom-2 left-2 z-10 rounded-full bg-black/70 px-2 py-0.5 text-xs text-white">{company}</span> : null}
          <PinMedia medium={medium} title={pin.title} href={pin.sourceUrl} external priority sizes="(max-width: 1024px) 100vw, 50vw" />
        </div>
      ) : null}

      {!medium && (company || locationText) ? (
        <div className="mb-1 flex flex-wrap gap-x-3 text-xs text-muted">
          {company}
          {locationText ? <span>{locationText}</span> : null}
        </div>
      ) : null}

      {pin.utcStartDateTime ? (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted italic">
          <StartTime pin={pin} serverTimeZone={timeZone} allDaySuffix />
          <DateConfidence level={pin.dateConfidence} reasoning={pin.dateConfidenceReasoning} showReasoning />
        </div>
      ) : null}

      {pin.utcStartDateTime ? <CountdownMeter start={pin.utcStartDateTime} since={pin.utcCreatedDateTime} allDay={pin.allDay} /> : null}

      <h1 className="mt-2 mb-3 flex items-start gap-2 text-2xl leading-snug">
        {pin.sourceUrl ? (
          <>
            <a href={pin.sourceUrl} target="_blank" rel="noopener" className="text-ink hover:no-underline">
              {pin.title}
            </a>
            <a href={pin.sourceUrl} target="_blank" rel="noopener" aria-label="Open the source" className="mt-1.5 text-muted">
              <Icon name="external" className="size-4" />
            </a>
          </>
        ) : (
          pin.title
        )}
      </h1>

      {pin.description ? <div className="rich-text mb-1 text-[15px] font-medium text-ink" dangerouslySetInnerHTML={{ __html: safeHtml(pin.description) }} /> : null}
      {pin.longFormSummary ? <div className="rich-text text-[15px] leading-relaxed text-ink" dangerouslySetInnerHTML={{ __html: safeHtml(pin.longFormSummary) }} /> : null}

      {pin.user?.id && pin.user.userName ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-raised py-3">
          <RefineLink field="user" value={pin.user.userName} className="flex items-center gap-2 font-semibold text-ink hover:no-underline">
            <UserAvatar userName={pin.user.userName} pictureUrl={pin.user.pictureUrl} className="size-7 text-sm" />
            {pin.user.userName}
          </RefineLink>
          <FollowButton userId={pin.user.id} userName={pin.user.userName} showCount />
        </div>
      ) : null}

      <div className="flex items-center justify-between py-2">
        <div className={pin.price != null && pin.price < 0 ? 'text-red-400' : ''}>
          {pin.price ? (
            <>
              <span className="text-muted">Cost:</span> <span className="text-green-400">{money(pin.price, pin.priceCurrency)}</span>
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
                className={`flex items-center gap-2 rounded px-3 py-2 text-sm font-semibold hover:no-underline ${
                  merchant.label === 'Amazon' ? 'bg-[#ff9900] text-black' : merchant.label === 'Best Buy' ? 'bg-[#0046be] text-white' : 'bg-raised text-ink'
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
    </>
  );
}

async function Thread({ pin }: { pin: PinJson }) {
  const pins = await threadPins(pin.id);
  return (
    <section aria-labelledby="thread-heading" className="mt-6">
      <div className="flex items-baseline justify-between">
        <h2 id="thread-heading" className="text-xl">
          Thread
        </h2>
        <Link href={`/respond/${pin.id}`} className="text-sm" prefetch={false}>
          Respond to this Pin
        </Link>
      </div>
      <ol className="mt-2 space-y-1">
        {pins.map((p, index) => (
          <li key={p.id}>
            <Link
              href={pinPath(p)}
              aria-current={p.id === pin.id ? 'page' : undefined}
              className={`flex gap-4 rounded px-4 py-3 font-semibold text-ink hover:no-underline ${p.id === pin.id ? 'bg-raised' : 'hover:bg-raised/60'}`}
            >
              <span className="text-muted">{index + 1}</span>
              {p.title}
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

async function PinCommentsSection({ pinId }: { pinId: number }) {
  return <Comments pinId={pinId} initialComments={await pinComments(pinId)} />;
}

async function Related({ pin }: { pin: PinJson }) {
  const [pins, timeZone] = await Promise.all([relatedPins(pin.id, pin.title), viewerTimeZone()]);
  if (!pins.length) {
    return null;
  }
  return (
    <section aria-labelledby="related-heading" className="mt-12">
      <h2 id="related-heading" className="mb-3 text-xl">
        More like this
      </h2>
      <ul className="gap-2.5 sm:columns-2 lg:columns-3 xl:columns-4">
        {toCardPins(pins).map((p) => (
          <li key={p.id} className="mb-2.5 break-inside-avoid">
            <PinCard pin={p} serverTimeZone={timeZone} />
          </li>
        ))}
      </ul>
    </section>
  );
}
