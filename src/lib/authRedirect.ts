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

export type AuthPage = '/login' | '/signup';

// A Log in or Sign up link that comes back to this page afterwards.
export function authHref(page: AuthPage, pathname: string | null | undefined): string {
  const next = afterLoginPath(pathname);
  return next === '/' ? page : `${page}?redirect=${encodeURIComponent(next)}`;
}
