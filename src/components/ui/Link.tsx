'use client';

import NextLink from 'next/link';
import type { ComponentProps } from 'react';
import { useLocale } from '@/lib/client/i18n';
import { localizePath } from '@/lib/i18n/config';
import { externalLinkAttributes, relativeSiteHref } from '@/lib/siteLinks';

// next/link in the page's language: href="/map" links to /es/map on a Spanish page.
// Not prefetched unless a link asks to be: every nav and footer link on a page
// would otherwise make the server render its page in the background (about ten
// renders per page view; 2026-10-17 that was most of a 2-vCPU VM's load).
export default function Link({ href, ...props }: ComponentProps<typeof NextLink>) {
  const locale = useLocale();
  const relative = relativeSiteHref(href);
  return <NextLink href={typeof relative === 'string' ? localizePath(relative, locale) : relative} prefetch={false} {...props} {...externalLinkAttributes(relative, props.rel)} />;
}
