import type { NextRequest } from 'next/server';
import { route } from '@/server/http';
import Digest from '@/server/model/digest';
import { readUnsubscribeToken } from '@/server/services/weeklyDigest';

// The unsubscribe link in the weekly email. The token alone says whose it is,
// so it works signed out. GET unsubscribes (it is a link in an email) and POST
// is the mail app's one-click unsubscribe (List-Unsubscribe-Post).
async function unsubscribe(request: NextRequest): Promise<number | null> {
  const userId = await readUnsubscribeToken(request.nextUrl.searchParams.get('token') ?? '');
  if (userId) await Digest.setSubscribed(userId, false);
  return userId;
}

const page = (ok: boolean) =>
  new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Chronopin weekly email</title>
<style>body{font-family:system-ui,sans-serif;max-width:32rem;margin:15vh auto;padding:0 1rem;line-height:1.6;color:#15181d}a{color:#1d62c2}</style></head><body>
<h1>${ok ? 'You are unsubscribed' : 'This link did not work'}</h1>
<p>${ok ? 'You will not get the weekly email any more. You can turn it back on any time under Notifications in your profile.' : 'The unsubscribe link is not valid. You can switch the weekly email off under Notifications in your profile.'}</p>
<p><a href="/profile/notifications">Notification settings</a> · <a href="/">Chronopin</a></p></body></html>`,
    { status: ok ? 200 : 400, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } },
  );

export const GET = route(async (request: NextRequest) => page((await unsubscribe(request)) !== null));
export const POST = route(async (request: NextRequest) => page((await unsubscribe(request)) !== null));
