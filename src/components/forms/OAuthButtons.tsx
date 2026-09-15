'use client';

// Sign in with Google or Facebook. On the sign-up page the chosen @handle is
// left in a short-lived cookie for the callback to give a new account.
export function OAuthButtons({ handle, validate }: { handle?: string; validate?: () => boolean }) {
  function go(provider: 'google' | 'facebook') {
    if (validate && !validate()) return;
    document.cookie = handle && handle.length > 1 ? `handle=${encodeURIComponent(handle)}; path=/; max-age=600; samesite=lax` : 'handle=; path=/; max-age=0';
    // A full navigation: /auth/* is a route handler that redirects to the provider.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = `/auth/${provider}`;
  }
  return (
    <div className="grid gap-2.5 sm:grid-cols-2">
      <button type="button" onClick={() => go('google')} className="btn bg-white text-neutral-900 ring-1 ring-line ring-inset hover:bg-neutral-200">
        <GoogleMark />
        Google
      </button>
      <button type="button" onClick={() => go('facebook')} className="btn bg-[#1466d8] text-white hover:bg-[#1259bd]">
        <FacebookMark />
        Facebook
      </button>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.5 5.5 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.7z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.7-4.9h-4v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.3 14.4a7.2 7.2 0 0 1 0-4.7V6.6h-4a12 12 0 0 0 0 10.8z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1C6.3 6.9 8.9 4.8 12 4.8z" />
    </svg>
  );
}

function FacebookMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden>
      <path d="M24 12a12 12 0 1 0-13.9 11.9v-8.4h-3V12h3V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v2.9h-1.5c-1.5 0-2 .9-2 1.9V12h3.4l-.5 3.5h-2.9v8.4A12 12 0 0 0 24 12z" />
    </svg>
  );
}

export function OrDivider({ children = 'or' }: { children?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 text-xs tracking-wider text-subtle uppercase">
      <span className="h-px flex-1 bg-line" />
      {children}
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}
