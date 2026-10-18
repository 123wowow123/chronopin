import type { ComponentProps } from 'react';
import { externalLinkAttributes, relativeSiteUrl } from '@/lib/siteLinks';

// Plain anchors (sources, messages, and downloads) share the navigation rule.
export default function Anchor({ href, ...props }: ComponentProps<'a'>) {
  return <a {...props} href={href ? relativeSiteUrl(href) : href} {...externalLinkAttributes(href, props.rel)} />;
}
