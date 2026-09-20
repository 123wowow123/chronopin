'use client';

import Link from '@/components/ui/Link';
import { usePathname, useRouter } from '@/lib/client/navigation';
import { authHref, type AuthPage } from '@/lib/authRedirect';
import { savePendingAction, type PendingAction } from '@/lib/client/pendingAction';
import { authHrefHere, logoutHrefHere } from '@/lib/client/returnSpot';

// A Log in or Sign up link that comes back to this page, and on the timeline
// to the place scrolled to, which is only known at the click.
// pending: what the reader was about to do and could not, which logging in
// then carries out rather than leaving them to ask for it again.
export function AuthLink({
  to,
  className,
  pending,
  children,
}: {
  to: AuthPage;
  className?: string;
  pending?: PendingAction;
  children: React.ReactNode;
}) {
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
        if (pending) savePendingAction(pending);
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
