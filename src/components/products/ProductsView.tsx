import type { ReactNode } from 'react';
import { ShelfTabs } from '@/components/products/ShelfTabs';
import { CardImage } from '@/components/pin/CardImage';
import { JsonLd } from '@/components/JsonLd';
import { RatingSummary } from '@/components/pin/PinRatings';
import Anchor from '@/components/ui/Anchor';
import { Icon } from '@/components/ui/Icon';
import Link from '@/components/ui/Link';
import { AdFilledGrid } from '@/components/restaurants/AdFilledGrid';
import { RestaurantCardAdsProvider } from '@/components/restaurants/RestaurantAdCard';
import styles from '@/components/restaurants/RestaurantGuide.module.css';
import { adPlacements } from '@/server/services/pages';
import { blobUrl } from '@/lib/appConfig';
import { pinTextDir } from '@/lib/i18n/config';
import { absoluteUrl, pinPath } from '@/lib/seo';
import { LandingMark } from '@/components/ui/LandingMark';
import { isKidsFriendlyProduct } from '@/lib/products';
import type { PinJson } from '@/lib/types';
import type { ProductPin, ProductShelf } from '@/server/services/products';

// PinThumb's pinPicture, which a server component cannot call from a client
// module: a video's still first, else the earliest medium.
function picture(media: PinJson['media']) {
  const medium = media?.find((m) => String(m.type) === '3') ?? media?.[0];
  return { thumbName: medium?.thumbName, originalUrl: String(medium?.type) === '1' ? medium?.originalUrl : undefined,
    portrait: !!(medium?.thumbWidth && medium.thumbHeight && medium.thumbHeight > medium.thumbWidth * 1.2) };
}

// Why the product is worth a look: its curated line (ProductBlurb), else the
// pin's own description as plain text, cut at a sentence end when it runs long.
function blurb(pin: ProductPin): string {
  if (pin.blurb) return pin.blurb;
  const text = (pin.description ?? '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  if (text.length <= 180) return text || pin.title;
  const cut = text.slice(0, 180);
  const end = cut.lastIndexOf('. ');
  return end > 80 ? cut.slice(0, end + 1) : `${cut.replace(/\s+\S*$/, '')}…`;
}

// The curated products page: the products pins are about, by shelf, each with
// a short line on why it is good. Every product links to its pin for the dates, the
// sources and the rest.
export async function ProductsView({ shelves, title, description, path = '/products', wordmark = 'The product guide', eyebrow = 'GOOD GEAR. GREAT TIMING.', heading = <>The products worth <em>the wait.</em></> }: {
  shelves: ProductShelf[];
  title: string;
  description: string;
  path?: string;
  wordmark?: string;
  eyebrow?: string;
  heading?: ReactNode;
}) {
  const placements = await adPlacements();
  const products = shelves.flatMap((s) => s.pins);
  const collection = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: title,
    description,
    url: absoluteUrl(path),
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: products.length,
      itemListElement: products.map((pin, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: absoluteUrl(pinPath(pin)),
        name: pin.productName ?? pin.title,
      })),
    },
  };

  const imageOf = (pin: PinJson) => blobUrl(picture(pin.media).thumbName);
  const featured = products.find((pin) => imageOf(pin));
  const id = (category: string) => category.toLowerCase().replace(/\s+/g, '-');

  return (
    <RestaurantCardAdsProvider value={placements['card-grid']}>
    <main className={styles.guide} data-landing>
      <LandingMark />
      <JsonLd data={collection} />
      <div className={styles.container}>
        <div className={styles.guideNav}>
          <Link href={path} className={styles.wordmark}><span aria-hidden="true">✳</span> {wordmark}</Link>
        </div>

        <header className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>{eyebrow}</p>
            <h1>{heading}</h1>
            <p className={styles.lead}>{description}</p>
          </div>
          {featured ? (
            <Link href={pinPath(featured)} className={styles.featured} aria-label={`Explore ${featured.productName ?? featured.title}`}>
              {/* eslint-disable-next-line @next/next/no-img-element -- pin thumbs come from the blob store */}
              <img src={imageOf(featured)} alt={featured.productName ?? featured.title} className={styles.featuredImage} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
              <div className={styles.featuredShade} />
              <span className={styles.featuredBadge}>CHRONOPIN SELECTION</span>
              <div className={styles.featuredCopy}>
                <p>
                  {featured.company ?? featured.categories?.[0]}
                  {isKidsFriendlyProduct(featured) ? ' · Kids friendly' : ''}
                </p>
                <h2>{featured.productName ?? featured.title}</h2>
                <span>See the product <span aria-hidden="true">↗</span></span>
              </div>
            </Link>
          ) : (
            <div className={styles.noFeature}><span aria-hidden="true">✳</span><p>Good things<br />to look forward to.</p></div>
          )}
        </header>

        <ShelfTabs
          tabs={shelves.map((shelf) => ({ id: id(shelf.name), label: shelf.label, count: shelf.pins.length }))}
          panels={shelves.map((shelf) => {
          const label = shelf.label;
          return (
            <section key={shelf.name} id={id(shelf.name)} className={styles.section} aria-labelledby={`${id(shelf.name)}-title`}>
              <div className={styles.sectionHeading}>
                <div>
                  <h2 id={`${id(shelf.name)}-title`}>{label} <span>{shelf.pins.length.toString().padStart(2, '0')}</span></h2>
                  <p>Why each one is worth a look.</p>
                </div>
              </div>
              <AdFilledGrid cards={
                shelf.pins.map((pin) => {
                  const image = imageOf(pin);
                  const name = pin.productName ?? pin.title;
                  const isKidsFriendly = isKidsFriendlyProduct(pin, shelf.name);
                  return (
                    <article key={pin.id} className={styles.card}>
                      <Link href={pinPath(pin)} className={styles.photoLink} aria-label={`See ${name}`}>
                        {image ? (
                          <CardImage thumbName={picture(pin.media).thumbName!} alt={name} portrait={picture(pin.media).portrait} className={styles.cardImage} />
                        ) : (
                          <span className={styles.photoPlaceholder} aria-hidden="true">✳</span>
                        )}
                        <span className={styles.cardBadge}>{label.toUpperCase()}</span>
                      </Link>
                      <div className={styles.cardBody}>
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <p className={styles.cardMeta} style={{ margin: 0 }}>
                            {pin.company ? <span>{pin.company}</span> : null}
                            {isKidsFriendly && (
                              <>
                                {pin.company ? <span aria-hidden="true">·</span> : null}
                                <span className={styles.kidsBadge}>Kids friendly</span>
                              </>
                            )}
                          </p>
                          <Score pin={pin} />
                        </div>
                        <h3><Link href={pinPath(pin)} dir={pinTextDir(pin)}>{name}</Link></h3>
                        {shelf.name === 'Alcoholic Drinks' && pin.utcStartDateTime && (
                          <p className={styles.cardMeta}>
                            {new Date(pin.utcStartDateTime).getTime() > Date.now() ? 'Coming' : 'Released'}{' '}
                            <time dateTime={String(pin.utcStartDateTime).slice(0, 10)}>
                              {new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(pin.utcStartDateTime))}
                            </time>
                          </p>
                        )}
                        <p className={styles.cardDescription} dir={pinTextDir(pin)}>{blurb(pin)}</p>
                      </div>
                    </article>
                  );
                })
              } />
            </section>
          );
          })}
        />

      </div>
    </main>
    </RestaurantCardAdsProvider>
  );
}

// The product's published score: its pin's own ratings when it has them, else
// the one found for the page (ProductBlurb).
function Score({ pin }: { pin: ProductPin }) {
  if (pin.ratings?.length) return <RatingSummary ratings={pin.ratings} />;
  const r = pin.rating;
  if (!r) return null;
  const chip = (
    <>
      <Icon name="star" className="size-3 text-amber-500 fill-amber-500" />
      <span>{r.score}/{r.max} · {r.source}</span>
    </>
  );
  const cls = 'inline-flex w-fit shrink-0 items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-ink ring-1 ring-amber-500/30 ring-inset tabular-nums hover:no-underline';
  return r.url ? <Anchor href={r.url} target="_blank" rel="noopener nofollow" className={cls}>{chip}</Anchor> : <span className={cls}>{chip}</span>;
}
