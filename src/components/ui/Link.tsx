'use client';

import NextLink from 'next/link';
import type { ComponentProps } from 'react';
import { useLocale } from '@/lib/client/i18n';
import { localizePath } from '@/lib/i18n/config';

// next/link in the page's language: href="/map" links to /es/map on a Spanish page.
export default function Link({ href, ...props }: ComponentProps<typeof NextLink>) {
  const locale = useLocale();
  return <NextLink href={typeof href === 'string' ? localizePath(href, locale) : href} {...props} />;
}
