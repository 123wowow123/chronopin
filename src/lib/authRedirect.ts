// Pages there is no point coming back to once signed in.
const AUTH_PATHS = ['/login', '/signup', '/logout'];

// Where logging in goes next: the ?redirect path if it is on this site and not
// an auth page, else home. Log in from the signup page used to land back on
// signup.
export function afterLoginPath(redirect: string | null | undefined): string {
  // '//host' and '/\host' both leave the site.
  if (!redirect || !redirect.startsWith('/') || redirect.startsWith('//') || redirect.startsWith('/\\')) return '/';
  const path = redirect.split(/[?#]/)[0].toLowerCase();
  return AUTH_PATHS.some((auth) => path === auth || path.startsWith(`${auth}/`)) ? '/' : redirect;
}

// A Log in link that comes back to this page afterwards.
export function loginHref(pathname: string): string {
  const next = afterLoginPath(pathname);
  return next === '/' ? '/login' : `/login?redirect=${encodeURIComponent(next)}`;
}
