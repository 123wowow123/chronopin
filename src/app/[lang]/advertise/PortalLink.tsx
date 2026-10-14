'use client';

import type { ComponentProps } from 'react';
import Link from '@/components/ui/Link';
import { useSession } from '@/lib/client/session';

// A link into the advertiser's portal (/profile/ads). The portal redirects
// signed-out visitors to the login page while it streams, which a client-side
// navigation does not follow reliably, so a visitor known to be signed out is
// sent to the login page directly, with the portal as where to come back to.
export function PortalLink({ href, ...props }: Omit<ComponentProps<typeof Link>, 'href'> & { href: string }) {
  const { status, user } = useSession();
  const target = status === 'ready' && !user ? `/login?redirect=${encodeURIComponent(href)}` : href;
  return <Link href={target} prefetch={false} {...props} />;
}
