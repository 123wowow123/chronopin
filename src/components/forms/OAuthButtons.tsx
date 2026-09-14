'use client';

// Sign in with Google or Facebook. On the sign-up page the chosen @handle is
// left in a short-lived cookie for the callback to give a new account.
export function OAuthButtons({ handle, validate }: { handle?: string; validate?: () => boolean }) {
  function go(provider: 'google' | 'facebook') {
    if (validate && !validate()) return;
    document.cookie = handle && handle.length > 1 ? `handle=${encodeURIComponent(handle)}; path=/; max-age=600; samesite=lax` : 'handle=; path=/; max-age=0';
    window.location.href = `/auth/${provider}`;
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <button type="button" onClick={() => go('facebook')} className="rounded bg-[#3b5998] px-4 py-2 font-semibold text-white">
        Connect with Facebook
      </button>
      <button type="button" onClick={() => go('google')} className="rounded bg-[#dd4b39] px-4 py-2 font-semibold text-white">
        Connect with Google
      </button>
    </div>
  );
}
