// Confirming an account's email address (0071). The link carries a signed
// token - no table: it names the user and the address it was sent to, so a
// link to an address the account has since changed away from does nothing.
// Clicking it again after it worked is harmless.

import { jwtVerify, SignJWT } from 'jose';
import { after, type NextRequest } from 'next/server';
import { siteUrl } from '@/lib/appConfig';
import config from './config';
import { type Email, sendEmail } from './email';
import { EMAIL_LOGO_PNG_BASE64 } from './emailLogo';
import { publicOrigin } from './http';
import type User from './model/user';
import { HttpError } from './util/httpError';
import log from './util/log';

const PURPOSE = 'verify-email';
const TOKEN_TTL = '3d';
// One resend per account per minute, per server process.
const RESEND_GAP_MS = 60 * 1000;

const secret = new TextEncoder().encode(config.secrets.session);
const lastSent = new Map<number, number>();

export function signVerifyToken(id: number, email: string): Promise<string> {
  return new SignJWT({ purpose: PURPOSE, id, email })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_TTL)
    .sign(secret);
}

// The user and address a link was for; 'expired' or 'invalid' otherwise.
// A session token is signed with the same secret, so the purpose is checked.
export async function readVerifyToken(token: string): Promise<{ id: number; email: string } | 'expired' | 'invalid'> {
  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] });
    const id = Number(payload.id);
    if (payload.purpose !== PURPOSE || !Number.isInteger(id) || typeof payload.email !== 'string') return 'invalid';
    return { id, email: payload.email };
  } catch (err) {
    return (err as { code?: string }).code === 'ERR_JWT_EXPIRED' ? 'expired' : 'invalid';
  }
}

// Production links always name the real site: the Host header is the
// client's to set, and a link built from it could hand the token elsewhere.
function linkOrigin(request: NextRequest): string {
  return process.env.NODE_ENV === 'production' ? siteUrl : publicOrigin(request);
}

const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const LOGO_CID = 'chronopin-logo';
const FONT = "'Google Sans',Roboto,'Helvetica Neue',Arial,sans-serif";

// Laid out like the account emails people already trust (Google's): the mark
// and name, the address the email is about - a link to the profile - a rule,
// then a greeting by name. Tables and inline styles, since mail clients drop
// <style> and flexbox. The logo travels inline (cid:), so it shows even in a
// message sent from a local server.
export function verificationEmail(
  user: { firstName?: string | null; userName?: string | null; email: string },
  { link, profileUrl }: { link: string; profileUrl: string },
): Email {
  const name = user.firstName || user.userName?.replace(/^@/, '') || '';
  const hello = name ? `Hello ${name},` : 'Hello,';
  const text = [
    `Chronopin account: ${user.email}`,
    '',
    hello,
    '',
    'Thanks for joining Chronopin. Confirm your email address to start posting pins and comments:',
    link,
    '',
    'The link works for 3 days. If you did not sign up for Chronopin, you can ignore this email.',
  ].join('\n');
  const e = escapeHtml;
  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#f8f9fa">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fa;padding:40px 12px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #dadce0;border-radius:12px">
<tr><td style="padding:40px 32px 24px;text-align:center;font-family:${FONT}">
<img src="cid:${LOGO_CID}" width="48" height="48" alt="" style="display:inline-block;vertical-align:middle;border:0">
<span style="display:inline-block;vertical-align:middle;margin-left:8px;font-size:30px;font-weight:600;letter-spacing:-0.5px;color:#202124">Chronopin</span>
<div style="margin-top:16px;font-size:15px"><a href="${e(profileUrl)}" style="color:#1a73e8;text-decoration:underline">${e(user.email)}</a></div>
</td></tr>
<tr><td style="padding:0 32px"><div style="border-top:1px solid #dadce0;line-height:0;font-size:0">&nbsp;</div></td></tr>
<tr><td style="padding:28px 32px 36px;font-family:${FONT};font-size:16px;line-height:1.6;color:#3c4043">
<p style="margin:0 0 20px">${e(hello)}</p>
<p style="margin:0 0 28px">Thanks for joining Chronopin. Confirm your email address to start posting pins and comments.</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 28px"><tr><td style="border-radius:8px;background:#1a73e8">
<a href="${e(link)}" style="display:inline-block;padding:12px 28px;font-family:${FONT};font-size:16px;font-weight:600;color:#ffffff;text-decoration:none">Confirm email</a>
</td></tr></table>
<p style="margin:0 0 12px;font-size:14px;color:#5f6368">Or paste this link into your browser:<br><a href="${e(link)}" style="color:#1a73e8;word-break:break-all">${e(link)}</a></p>
<p style="margin:0;font-size:14px;color:#5f6368">The link works for 3 days. If you did not sign up for Chronopin, you can ignore this email.</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
  return {
    to: user.email,
    subject: 'Confirm your email for Chronopin',
    text,
    html,
    attachments: [{ filename: 'chronopin.png', contentBase64: EMAIL_LOGO_PNG_BASE64, contentId: LOGO_CID }],
  };
}

export async function sendVerificationEmail(user: User, request: NextRequest): Promise<void> {
  const token = await signVerifyToken(user.id, user.email);
  const origin = linkOrigin(request);
  const link = `${origin}/auth/verify-email?token=${encodeURIComponent(token)}`;
  lastSent.set(user.id, Date.now());
  await sendEmail(verificationEmail(user, { link, profileUrl: `${origin}/profile` }));
}

// For sign-up and an email change, after the response: the account is
// already saved, so a mail failure is logged rather than failing the request.
// The banner's resend button is the way back.
export function sendVerificationEmailInBackground(user: User, request: NextRequest): void {
  after(() => sendVerificationEmail(user, request).catch((err) => log.error(`verification email to user ${user.id} failed:`, (err as Error).message)));
}

// The resend button: a 429 inside the gap, so it cannot be used to flood an inbox.
export async function resendVerificationEmail(user: User, request: NextRequest): Promise<void> {
  const last = lastSent.get(user.id);
  if (last && Date.now() - last < RESEND_GAP_MS) {
    throw new HttpError(429, 'A confirmation email was just sent.', { code: 'emailVerifyTooSoon', message: 'A confirmation email was just sent. Try again in a minute.' });
  }
  await sendVerificationEmail(user, request);
}

// Posting needs a confirmed email; browsing, liking and following do not.
export function requireVerifiedEmail(user: User): void {
  if (!user.emailVerifiedDateTime) {
    throw new HttpError(403, 'Confirm your email address first.', { code: 'emailUnverified', message: 'Confirm your email address first.' });
  }
}
