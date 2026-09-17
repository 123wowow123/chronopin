'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { authHref, type AuthPage } from '@/lib/authRedirect';
import { authHrefHere, logoutHrefHere } from '@/lib/client/returnSpot';

// A Log in or Sign up link that comes back to this page, and on the timeline
// to the place scrolled to, which is only known at the click.
export function AuthLink({ to, className, children }: { to: AuthPage; className?: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  return (
    <Link
      href={authHref(to, pathname)}
      className={className}
      onClick={(event) => {
        // A new tab or window keeps this page as it is.
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        router.push(authHrefHere(to));
      }}
    >
      {children}
    </Link>
  );
}

// Log out, back to this page and the place on it. A plain link: logging out is
// a route handler, and every page has to forget who was signed in.
export function LogoutLink({ className, children }: { className?: string; children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <a
      href={`/logout?referrer=${encodeURIComponent(pathname)}`}
      className={className}
      onClick={(event) => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        window.location.assign(logoutHrefHere());
      }}
    >
      {children}
    </a>
  );
}
