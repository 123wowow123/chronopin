// URLs, metadata and structured data (JSON-LD) for public pages.

import type { Metadata } from 'next';
import { blobUrl, siteDescription, siteName, siteUrl } from './appConfig';
import { slugify } from './categories';
import type { PinEventInfoJson } from './eventInfo';
import { plainText } from './format';
import { DEFAULT_LOCALE, INTL_LOCALES, languageAlternates, localizePath, type Locale } from './i18n/config';
import type { PinJson } from './types';

export function absoluteUrl(path: string): string {
  return `${siteUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

// The canonical path of a pin page: its id, then its title as a slug for
// readable, keyword-bearing URLs. The id alone is enough to find the pin, so
// a renamed pin's old links still resolve (and redirect to the new slug).
// A translated pin keeps its own title's slug: one slug in every language.
export function pinPath(pin: Pick<PinJson, 'id' | 'title'> & { originalTitle?: string }): string {
  const slug = slugify(pin.originalTitle || pin.title || '').slice(0, 80).replace(/-+$/, '');
  return slug ? `/pin/${pin.id}/${slug}` : `/pin/${pin.id}`;
}

// The first image a pin can show: its thumb, or the original when there is none.
export function pinImage(pin: PinJson): { url: string; width?: number; height?: number } | null {
  const image = pin.media?.find((m) => String(m.type) === '1');
  if (!image) {
    return null;
  }
  if (image.thumbName) {
    return { url: blobUrl(image.thumbName)!, width: image.thumbWidth, height: image.thumbHeight };
  }
  return image.originalUrl ? { url: image.originalUrl, width: image.originalWidth, height: image.originalHeight } : null;
}

export function pinDescription(pin: PinJson): string {
  return plainText(pin.description || pin.longFormSummary || `${pin.title} on ${siteName}`, 160);
}

export function pinMetadata(pin: PinJson, locale: Locale = DEFAULT_LOCALE, offered?: readonly Locale[]): Metadata {
  const links = languageAlternates(pinPath(pin), locale, offered);
  const path = links.canonical;
  const description = pinDescription(pin);
  // The pin's own image, or a generated share card when it has none.
  const image = pinImage(pin);
  const images = image
    ? [{ url: image.url, width: image.width, height: image.height, alt: pin.title }]
    : [{ url: `/og/pin/${pin.id}`, width: 1200, height: 630, alt: pin.title }];

  return {
    title: pin.title,
    description,
    alternates: links,
    openGraph: {
      type: 'article',
      url: path,
      locale: INTL_LOCALES[locale].replace('-', '_'),
      title: pin.title,
      description,
      siteName,
      publishedTime: pin.utcCreatedDateTime,
      modifiedTime: pin.utcUpdatedDateTime || pin.utcCreatedDateTime,
      section: pin.categories?.[0],
      images,
    },
    twitter: {
      card: 'summary_large_image',
      title: pin.title,
      description,
      images: images.map((i) => i.url),
    },
  };
}

// Categories that are a gathering people go to: a conference or a festival
// always is. A match or a show is too, unless the pin is really about a deal,
// a product or a release that merely involves a sport or a musician. A show
// has a doors time, which a music product or album release (all day) lacks.
const EVENT_CATEGORIES = ['Conference', 'Festival'];
const NOT_EVENT_CATEGORIES = [
  'Business', 'Finance', 'Economy', 'Law', 'Justice', 'Labour', 'Policy', 'Architecture', 'Property', 'Retail', 'Fashion',
  'Electronics', 'Audio', 'Movie', 'TV', 'Anime', 'Gaming',
];

// Whether a pin is an event Google would list: a place people can go to, for
// a gathering open to the public. Most pins with a place are not - an anime
// placed at its studio, an earnings call at the head office, a law where it
// was passed - and Google's guidelines rule out marking those as events.
export function isAttendableEvent(pin: PinJson): boolean {
  const hasPlace = !!pin.address || (pin.latitude != null && pin.longitude != null);
  if (!hasPlace) {
    return false;
  }
  const categories = pin.categories ?? [];
  if (categories.some((c) => EVENT_CATEGORIES.includes(c))) {
    return true;
  }
  if (categories.some((c) => NOT_EVENT_CATEGORIES.includes(c))) {
    return false;
  }
  return categories.includes('Sports') || (categories.includes('Music') && !pin.allDay);
}

// The Event's offers: the ticket price, sale state and link read off the
// event's pages (PinEventInfo), else the pin's own price. A price without a
// currency is left out rather than assumed to be dollars.
export function eventOffers(pin: PinJson, eventInfo: PinEventInfoJson | null | undefined, pageUrl: string) {
  const low = eventInfo?.lowPrice ?? pin.priceLowerBound ?? pin.price;
  const high = eventInfo?.lowPrice != null ? eventInfo.highPrice : (pin.priceUpperBound ?? pin.price);
  const currency = (eventInfo?.lowPrice != null ? eventInfo.priceCurrency : null) || pin.priceCurrency;
  const priced = low != null && !!currency;
  const availability = eventInfo?.availability;
  if (!priced && !availability && !eventInfo?.ticketUrl) {
    return undefined;
  }
  const range = priced && low != null && high != null && high > low;
  return {
    '@type': range ? 'AggregateOffer' : 'Offer',
    url: eventInfo?.ticketUrl || pin.sourceUrl || pageUrl,
    ...(priced ? (range ? { lowPrice: low, highPrice: high } : { price: low }) : {}),
    ...(priced ? { priceCurrency: currency } : {}),
    ...(availability ? { availability: `https://schema.org/${availability}` } : {}),
    ...(availability === 'PreOrder' && eventInfo?.onSaleDate ? { validFrom: eventInfo.onSaleDate } : {}),
  };
}

// JSON-LD for a pin page: the page is an Article about the pin, and when the
// pin is an event people can attend (isAttendableEvent) it is also about that
// Event. organizerUrl: the website of the pin's company, which hosts it.
// eventInfo: its performers and tickets, as read off its pages.
//
// Critic scores (IMDb, Rotten Tomatoes, MyAnimeList, ...) are shown on the
// page but not marked up: Google's review snippet guidelines forbid ratings
// gathered from other websites, and an Article cannot carry reviews anyway.
export function pinJsonLd(
  pin: PinJson,
  locale: Locale = DEFAULT_LOCALE,
  { organizerUrl, eventInfo }: { organizerUrl?: string | null; eventInfo?: PinEventInfoJson | null } = {},
) {
  const url = absoluteUrl(localizePath(pinPath(pin), locale));
  const offers = eventOffers(pin, eventInfo, url);
  const image = pinImage(pin);
  const description = pinDescription(pin);
  const organizer = pin.company
    ? {
        '@type': 'Organization',
        name: pin.company,
        ...(organizerUrl ? { url: organizerUrl } : {}),
        ...(pin.companyWikiUrl ? { sameAs: pin.companyWikiUrl } : {}),
      }
    : undefined;

  // An all-day pin with no end is that one day, so it ends on the day it
  // starts. A timed pin with no end has no end we know.
  const endDate = pin.utcEndDateTime
    ? eventDate(pin.utcEndDateTime, pin.allDay, true)
    : pin.allDay
      ? eventDate(pin.utcStartDateTime, true)
      : undefined;
  const event = isAttendableEvent(pin)
    ? {
        '@type': 'Event',
        name: pin.title,
        description,
        url,
        startDate: eventDate(pin.utcStartDateTime, pin.allDay),
        ...(endDate ? { endDate } : {}),
        eventStatus:
          pin.dateConfidence === 'delayed' ? 'https://schema.org/EventRescheduled' : 'https://schema.org/EventScheduled',
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        location: {
          '@type': 'Place',
          name: pin.address || pin.title,
          ...(pin.address ? { address: pin.address } : {}),
          ...(pin.latitude != null && pin.longitude != null
            ? { geo: { '@type': 'GeoCoordinates', latitude: pin.latitude, longitude: pin.longitude } }
            : {}),
        },
        ...(image ? { image: [image.url] } : {}),
        ...(organizer ? { organizer } : {}),
        ...(eventInfo?.performers.length
          ? {
              performer: eventInfo.performers.map((p) => ({ '@type': p.type, name: p.name, ...(p.url ? { sameAs: p.url } : {}) })),
            }
          : {}),
        ...(offers ? { offers } : {}),
      }
    : undefined;

  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    '@id': `${url}#article`,
    mainEntityOfPage: url,
    inLanguage: INTL_LOCALES[locale],
    headline: pin.title.slice(0, 110),
    description,
    ...(image ? { image: [image.url] } : {}),
    datePublished: pin.utcCreatedDateTime,
    dateModified: pin.utcUpdatedDateTime || pin.utcCreatedDateTime,
    ...(pin.categories?.length ? { articleSection: pin.categories[0] } : {}),
    ...(pin.categories?.length || pin.tags?.length ? { keywords: [...(pin.categories ?? []), ...(pin.tags ?? []).map((t) => t.name)] } : {}),
    ...(pin.user?.userName ? { author: { '@type': 'Person', name: pin.user.userName } } : {}),
    publisher: { '@type': 'Organization', name: siteName, url: siteUrl },
    ...(pin.sourceUrl ? { isBasedOn: pin.sourceUrl } : {}),
    ...(event ? { about: event } : {}),
  };

  const breadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: siteName, item: siteUrl },
      { '@type': 'ListItem', position: 2, name: pin.title, item: url },
    ],
  };

  return [article, breadcrumbs];
}

// An all-day pin is a date, not an instant; its stored end is the day after
// its last day, so the last day is one before it.
function eventDate(iso: string, allDay?: boolean, isEnd = false): string {
  if (!allDay) {
    return iso;
  }
  const d = new Date(iso);
  if (isEnd) {
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return d.toISOString().slice(0, 10);
}

export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteName,
    url: siteUrl,
    description: siteDescription,
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${siteUrl}/search?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  };
}

// JSON for a <script type="application/ld+json">, with "<" escaped so a title
// containing "</script>" cannot end the tag early.
export function jsonLdString(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
