// URLs, metadata and structured data (JSON-LD) for public pages.

import type { Metadata } from 'next';
import { blobUrl, siteDescription, siteName, siteUrl } from './appConfig';
import { slugify } from './categories';
import { plainText, reviewRatings } from './format';
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

export function pinMetadata(pin: PinJson, locale: Locale = DEFAULT_LOCALE): Metadata {
  const links = languageAlternates(pinPath(pin), locale);
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

// JSON-LD for a pin page: the page is an Article about the pin, and when the
// pin has a place it is also about an Event there. Google only treats a page
// as an event with a location, so pins without one are not marked as events.
export function pinJsonLd(pin: PinJson, locale: Locale = DEFAULT_LOCALE) {
  const url = absoluteUrl(localizePath(pinPath(pin), locale));
  const image = pinImage(pin);
  const description = pinDescription(pin);
  const organizer = pin.company
    ? {
        '@type': 'Organization',
        name: pin.company,
        ...(pin.companyWikiUrl ? { sameAs: pin.companyWikiUrl } : {}),
      }
    : undefined;

  const hasPlace = !!pin.address || (pin.latitude != null && pin.longitude != null);
  const event = hasPlace
    ? {
        '@type': 'Event',
        name: pin.title,
        description,
        url,
        startDate: eventDate(pin.utcStartDateTime, pin.allDay),
        ...(pin.utcEndDateTime ? { endDate: eventDate(pin.utcEndDateTime, pin.allDay, true) } : {}),
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
        ...(pin.price != null
          ? {
              offers: {
                '@type': 'Offer',
                price: pin.price,
                priceCurrency: pin.priceCurrency || 'USD',
                url: pin.sourceUrl || url,
              },
            }
          : {}),
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
    // Third-party critic scores (IMDb, Rotten Tomatoes, MyAnimeList, ...),
    // each its own scale - reported as separate Reviews rather than one
    // averaged AggregateRating, which would misrepresent sources that don't
    // share a scale. A market's forecast of a score is not a review.
    ...(reviewRatings(pin.ratings).length
      ? {
          review: reviewRatings(pin.ratings).map((r) => ({
            '@type': 'Review',
            author: { '@type': 'Organization', name: r.source },
            ...(r.url ? { url: r.url } : {}),
            reviewRating: { '@type': 'Rating', ratingValue: r.score, bestRating: r.scoreMax, worstRating: 0 },
          })),
        }
      : {}),
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
