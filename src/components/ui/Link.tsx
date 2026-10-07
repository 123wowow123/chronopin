'use client';

import NextLink from 'next/link';
import type { ComponentProps } from 'react';
import { useLocale } from '@/lib/client/i18n';
import { localizePath } from '@/lib/i18n/config';
import { relativeSiteHref } from '@/lib/siteLinks';

// next/link in the page's language: href="/map" links to /es/map on a Spanish page.
export default function Link({ href, ...props }: ComponentProps<typeof NextLink>) {
  const locale = useLocale();
  const relative = relativeSiteHref(href);
  return <NextLink href={typeof relative === 'string' ? localizePath(relative, locale) : relative} {...props} />;
}
